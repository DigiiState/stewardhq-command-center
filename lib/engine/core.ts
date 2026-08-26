import { 
    Project, ProjectStatus, Milestone, Task, TaskStatus, 
    AuditEvent, AuditEventType, AuthorityLevel, VerificationLevel 
} from "./types";
import { PersistenceEngine } from "./persistence";
import { v4 as uuidv4 } from "uuid";

export class ExecutionEngine {
    private persistence = new PersistenceEngine();

    async runCycle() {
        console.log("[ENGINE] Starting cycle...");
        const registry = await this.persistence.loadRegistry();
        
        for (const [projectId, project] of Object.entries(registry)) {
            if ([ProjectStatus.COMPLETED, ProjectStatus.FAILED, ProjectStatus.CANCELLED].includes(project.status)) {
                continue;
            }
            await this.processProject(project);
        }
        console.log("[ENGINE] Cycle complete.");
    }

    async processProject(project: Project) {
        console.log(`[ENGINE] Processing project: ${project.name}`);
        
        // Watchdog stalls
        if (await this.checkStalls(project)) return;

        const milestones = await this.persistence.loadMilestones(project.id);
        const activeMilestone = milestones.find(m => ![ProjectStatus.COMPLETED, ProjectStatus.FAILED].includes(m.status));

        if (!activeMilestone) {
            if (milestones.every(m => m.status === ProjectStatus.COMPLETED)) {
                await this.completeProject(project);
            }
            return;
        }

        if (project.status === ProjectStatus.READY) {
            project.status = ProjectStatus.EXECUTING;
            await this.logEvent(project.id, AuditEventType.PROJECT_STARTED, "Project started", undefined, ProjectStatus.READY, ProjectStatus.EXECUTING);
        }

        if ([ProjectStatus.READY, ProjectStatus.PLANNING, ProjectStatus.WAITING_ON_APPROVAL].includes(activeMilestone.status)) {
            activeMilestone.status = ProjectStatus.EXECUTING;
        }

        await this.processMilestone(project, activeMilestone);
        await this.persistence.saveMilestones(project.id, milestones);
        await this.persistence.saveRegistry({ [project.id]: project });
    }

    async processMilestone(project: Project, milestone: Milestone) {
        const tasks = await this.persistence.loadTasks(milestone.id);
        let hasChanges = false;

        // Resume blocked tasks
        for (const task of tasks) {
            if (task.status === TaskStatus.BLOCKED && project.status === ProjectStatus.EXECUTING) {
                console.log(`[ENGINE] Resuming task: ${task.title}`);
                task.status = TaskStatus.PENDING;
                task.updated_at = new Date().toISOString();
                await this.logEvent(project.id, AuditEventType.EXECUTION_RESUMED, `Approval confirmed, resuming: ${task.title}`, task.id, TaskStatus.BLOCKED, TaskStatus.PENDING);
                hasChanges = true;
            }
        }

        // Check for completed/failed tasks
        for (const task of tasks) {
            if (task.status === TaskStatus.COMPLETED && task.verification_level !== VerificationLevel.PRODUCTION_PASS) {
                if (task.evidence) {
                    task.verification_level = VerificationLevel.PRODUCTION_PASS;
                    await this.logEvent(project.id, AuditEventType.RESULT_VERIFIED, "Task verified", task.id, task.status, task.status);
                    hasChanges = true;
                }
            }
            
            if (task.status === TaskStatus.FAILED) {
                if (task.retry_count < task.max_retries) {
                    task.retry_count++;
                    task.status = TaskStatus.PENDING;
                    await this.logEvent(project.id, AuditEventType.RETRY_STARTED, `Retrying task (attempt ${task.retry_count})`, task.id, TaskStatus.FAILED, TaskStatus.PENDING);
                    hasChanges = true;
                }
            }
        }

        // Find next task
        const nextTask = tasks.find(t => {
            if (t.status !== TaskStatus.PENDING) return false;
            return t.dependencies.every(depId => tasks.find(ot => ot.id === depId)?.status === TaskStatus.COMPLETED);
        });

        if (nextTask) {
            await this.startTask(project, nextTask);
            hasChanges = true;
        } else if (tasks.every(t => t.status === TaskStatus.COMPLETED)) {
            await this.completeMilestone(project, milestone);
            hasChanges = true;
        }

        if (hasChanges) {
            await this.persistence.saveTasks(milestone.id, tasks);
        }
    }

    async startTask(project: Project, task: Task) {
        console.log(`[ENGINE] Starting task: ${task.title}`);
        
        if (task.authority_level >= AuthorityLevel.YELLOW) {
            const events = await this.persistence.getAuditTrail(project.id);
            const hasApproval = events.some(e => e.event_type === AuditEventType.EXECUTION_RESUMED && e.task_id === task.id);
            
            if (!hasApproval) {
                project.status = ProjectStatus.WAITING_ON_APPROVAL;
                task.status = TaskStatus.BLOCKED;
                await this.logEvent(project.id, AuditEventType.APPROVAL_REQUESTED, `Approval required for YELLOW task: ${task.title}`, task.id, ProjectStatus.EXECUTING, ProjectStatus.WAITING_ON_APPROVAL);
                return;
            }
        }

        task.status = TaskStatus.IN_PROGRESS;
        task.updated_at = new Date().toISOString();
        await this.logEvent(project.id, AuditEventType.TASK_STARTED, `Task dispatched`, task.id, TaskStatus.PENDING, TaskStatus.IN_PROGRESS);
    }

    async checkStalls(project: Project): Promise<boolean> {
        const STALL_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
        
        if (![ProjectStatus.EXECUTING, ProjectStatus.READY].includes(project.status)) return false;
        
        const milestones = await this.persistence.loadMilestones(project.id);
        const executingMilestone = milestones.find(m => m.status === ProjectStatus.EXECUTING);
        
        if (executingMilestone) {
            const tasks = await this.persistence.loadTasks(executingMilestone.id);
            const inProgressTask = tasks.find(t => t.status === TaskStatus.IN_PROGRESS);
            
            if (inProgressTask) {
                const lastUpdate = new Date(inProgressTask.updated_at).getTime();
                if (Date.now() - lastUpdate > STALL_THRESHOLD_MS) {
                    console.warn(`[ENGINE] STALL DETECTED: ${inProgressTask.title}`);
                    await this.logEvent(project.id, AuditEventType.RECOVERY_STARTED, `Stall detected, attempting recovery.`, inProgressTask.id, TaskStatus.IN_PROGRESS, TaskStatus.PENDING);
                    inProgressTask.status = TaskStatus.PENDING;
                    inProgressTask.updated_at = new Date().toISOString();
                    await this.persistence.saveTasks(executingMilestone.id, tasks);
                    return true;
                }
            }
        }
        return false;
    }

    async completeMilestone(project: Project, milestone: Milestone) {
        milestone.status = ProjectStatus.COMPLETED;
        milestone.updated_at = new Date().toISOString();
        await this.logEvent(project.id, AuditEventType.MILESTONE_COMPLETED, `Milestone completed: ${milestone.title}`, undefined, ProjectStatus.EXECUTING, ProjectStatus.COMPLETED);
    }

    async completeProject(project: Project) {
        project.status = ProjectStatus.COMPLETED;
        project.updated_at = new Date().toISOString();
        await this.logEvent(project.id, AuditEventType.PROJECT_COMPLETED, `Project completed: ${project.name}`, undefined, ProjectStatus.EXECUTING, ProjectStatus.COMPLETED);
    }

    async logEvent(projectId: string, eventType: AuditEventType, message: string, taskId?: string, prev?: string, next?: string) {
        const event: AuditEvent = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            event_type: eventType,
            project_id: projectId,
            task_id: taskId,
            actor: "StewardHQ-Engine",
            previous_state: prev,
            new_state: next || "",
            message: message
        };
        await this.persistence.logAudit(event);
    }
}
