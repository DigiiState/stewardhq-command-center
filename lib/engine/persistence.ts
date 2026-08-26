import { createServiceClient } from "../supabase/service";
import { Project, Milestone, Task, AuditEvent, Decision } from "./types";

export class PersistenceEngine {
    private supabase = createServiceClient();

    async loadProjectState(projectId: string) {
        const { data, error } = await this.supabase
            .from("engine_state")
            .select("*")
            .eq("project_id", projectId)
            .maybeSingle();
        
        if (error) throw error;
        return data || { 
            project_id: projectId, 
            registry: {}, 
            milestones: [], 
            tasks: {}, 
            audit_log: [], 
            decisions: [] 
        };
    }

    async saveProjectState(projectId: string, state: any) {
        const { error } = await this.supabase
            .from("engine_state")
            .upsert({
                project_id: projectId,
                registry: state.registry,
                milestones: state.milestones,
                tasks: state.tasks,
                audit_log: state.audit_log,
                decisions: state.decisions,
                updated_at: new Date().toISOString()
            }, { onConflict: 'project_id' });
        
        if (error) throw error;
    }

    async loadRegistry(): Promise<Record<string, Project>> {
        const { data, error } = await this.supabase
            .from("engine_state")
            .select("registry");
        
        if (error) throw error;
        
        const registry: Record<string, Project> = {};
        data?.forEach((row: any) => {
            Object.assign(registry, row.registry);
        });
        return registry;
    }

    async saveRegistry(registry: Record<string, Project>) {
        // For each project in registry, update its specific row
        for (const [id, project] of Object.entries(registry)) {
            const { error } = await this.supabase
                .from("engine_state")
                .upsert({
                    project_id: id,
                    registry: { [id]: project },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'project_id' });
            if (error) throw error;
        }
    }

    async loadMilestones(projectId: string): Promise<Milestone[]> {
        const state = await this.loadProjectState(projectId);
        return state.milestones || [];
    }

    async saveMilestones(projectId: string, milestones: Milestone[]) {
        const { error } = await this.supabase
            .from("engine_state")
            .upsert({
                project_id: projectId,
                milestones: milestones,
                updated_at: new Date().toISOString()
            }, { onConflict: 'project_id' });
        if (error) throw error;
    }

    async loadTasks(milestoneId: string): Promise<Task[]> {
        // Find state row containing this milestone
        const { data, error } = await this.supabase
            .from("engine_state")
            .select("*");
        
        if (error) throw error;
        
        const row = data?.find((r: any) => r.milestones?.some((m: any) => m.id === milestoneId));
        return row?.tasks?.[milestoneId] || [];
    }

    async saveTasks(milestoneId: string, tasks: Task[]) {
        // This requires loading the project state first
        // Finding the project_id from milestoneId
        const { data: rows } = await this.supabase.from("engine_state").select("*");
        const row = rows?.find((r: any) => r.milestones?.some((m: any) => m.id === milestoneId));
        
        if (row) {
            const newTasks = { ...(row.tasks || {}), [milestoneId]: tasks };
            await this.saveProjectState(row.project_id, { ...row, tasks: newTasks });
        }
    }

    async logAudit(event: AuditEvent) {
        const { data: row } = await this.supabase
            .from("engine_state")
            .select("*")
            .eq("project_id", event.project_id)
            .maybeSingle();
        
        if (row) {
            const newLogs = [...(row.audit_log || []), event];
            await this.saveProjectState(event.project_id, { ...row, audit_log: newLogs });
        }
    }

    async getAuditTrail(projectId?: string): Promise<AuditEvent[]> {
        if (projectId) {
            const state = await this.loadProjectState(projectId);
            return state.audit_log || [];
        } else {
            const { data } = await this.supabase.from("engine_state").select("audit_log");
            return data?.flatMap((r: any) => r.audit_log || []) || [];
        }
    }

    async logDecision(decision: Decision) {
        if (decision.project_id) {
            const state = await this.loadProjectState(decision.project_id);
            const newDecisions = [...(state.decisions || []), decision];
            await this.saveProjectState(decision.project_id, { ...state, decisions: newDecisions });
        }
    }

    async getDecisions(projectId?: string): Promise<Decision[]> {
        if (projectId) {
            const state = await this.loadProjectState(projectId);
            return state.decisions || [];
        } else {
            const { data } = await this.supabase.from("engine_state").select("decisions");
            return data?.flatMap((r: any) => r.decisions || []) || [];
        }
    }
}
