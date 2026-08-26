import { v4 as uuidv4 } from "uuid";
import { 
    Project, ProjectStatus, Milestone, Task, TaskStatus, 
    AuthorityLevel 
} from "./types";
import { PersistenceEngine } from "./persistence";

export class ImplementationGateway {
    private persistence = new PersistenceEngine();

    async ingestSpecification(spec: any): Promise<Project> {
        const project: Project = {
            id: uuidv4(),
            business_id: spec.business_id,
            name: spec.name,
            description: spec.description,
            status: ProjectStatus.READY,
            milestones: [],
            authority_level: spec.authority_level || AuthorityLevel.GREEN,
            definition_of_done: spec.dod,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {}
        };

        const milestoneIds: string[] = [];
        const allMilestones: Milestone[] = [];
        const tasksMap: Record<string, Task[]> = {};
        
        for (const mSpec of spec.milestones) {
            const milestoneId = uuidv4();
            const milestone: Milestone = {
                id: milestoneId,
                project_id: project.id,
                title: mSpec.title,
                description: mSpec.description,
                status: milestoneIds.length === 0 ? ProjectStatus.READY : ProjectStatus.PLANNING,
                tasks: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const taskIds: string[] = [];
            const createdTasks: Task[] = [];
            const idMap: Record<string, string> = {}; // local -> real
            
            for (const tSpec of mSpec.tasks) {
                const realId = uuidv4();
                if (tSpec.id) idMap[tSpec.id] = realId;
                
                const task: Task = {
                    id: realId,
                    project_id: project.id,
                    milestone_id: milestoneId,
                    title: tSpec.title,
                    description: tSpec.description,
                    status: TaskStatus.PENDING,
                    authority_level: tSpec.authority_level || AuthorityLevel.GREEN,
                    dependencies: [],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    retry_count: 0,
                    max_retries: 3
                };
                taskIds.push(realId);
                createdTasks.push(task);
            }
            
            // Resolve deps
            for (let i = 0; i < mSpec.tasks.length; i++) {
                const tSpec = mSpec.tasks[i];
                if (tSpec.dependencies) {
                    createdTasks[i].dependencies = tSpec.dependencies.map((dep: string) => idMap[dep] || dep);
                }
            }
            
            milestone.tasks = taskIds;
            milestoneIds.push(milestoneId);
            allMilestones.push(milestone);
            
            // Save state part
            tasksMap[milestoneId] = createdTasks;
        }
        
        project.milestones = milestoneIds;
        
        // Final state assembly
        const state = {
            project_id: project.id,
            registry: { [project.id]: project },
            milestones: allMilestones,
            tasks: tasksMap, 
            audit_log: [],
            decisions: []
        };
        
        // Simplified save for the prototype port
        await this.persistence.saveProjectState(project.id, state);
        
        return project;
    }
}
