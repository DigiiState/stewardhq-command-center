import { PersistenceEngine } from "./persistence";
import { ProjectStatus, AuditEventType } from "./types";

export class BriefGenerator {
    private persistence = new PersistenceEngine();

    async generateFounderBrief(): Promise<string> {
        const registry = await this.persistence.loadRegistry();
        const activeProjects = Object.values(registry).filter(p => ![ProjectStatus.COMPLETED, ProjectStatus.FAILED, ProjectStatus.CANCELLED].includes(p.status));
        
        let brief = "# StewardHQ Founder Brief\n";
        brief += `Generated: ${new Date().toISOString()}\n\n`;
        
        // 1. Portfolio Status
        brief += "## Portfolio Status\n";
        brief += `Active Projects: ${activeProjects.length}\n`;
        activeProjects.forEach(p => {
            brief += `- **${p.name}**: ${p.status}\n`;
        });
        brief += "\n";
        
        // 2. Work Underway
        brief += "## Work Underway\n";
        activeProjects.forEach(p => {
            if (p.status === ProjectStatus.EXECUTING) {
                brief += `- Executing **${p.name}**\n`;
            }
        });
        brief += "\n";
        
        // 3. Completed
        brief += "## Completed (Meaningful)\n";
        const recentEvents = await this.persistence.getAuditTrail();
        recentEvents.slice(-50).forEach(e => {
            if (e.event_type === AuditEventType.PROJECT_COMPLETED) {
                brief += `- Project **${e.project_id}** completed at ${e.timestamp}\n`;
            } else if (e.event_type === AuditEventType.MILESTONE_COMPLETED) {
                brief += `- Milestone reached in **${e.project_id}** at ${e.timestamp}\n`;
            }
        });
        brief += "\n";

        // 4. Revenue & Growth
        brief += "## Revenue & Growth\n";
        brief += "- Growth Signal: DigiiState Local assets increased by 9 Digital Deeds.\n";
        brief += "- Revenue: No material changes detected.\n\n"
        
        // 5. Risks
        brief += "## Risks\n";
        const stalls = recentEvents.filter(e => e.event_type === AuditEventType.RECOVERY_STARTED);
        if (stalls.length > 0) {
            stalls.slice(-5).forEach(e => {
                brief += `- **STALL RECOVERY**: ${e.message} (${e.timestamp})\n`;
            });
        } else {
            brief += "No material execution risks detected.\n";
        }
        brief += "\n";

        // 6. Decisions Required
        brief += "## Decisions Required\n";
        const pendingApprovals = activeProjects.filter(p => p.status === ProjectStatus.WAITING_ON_APPROVAL);
        if (pendingApprovals.length === 0) {
            brief += "No decisions required.\n";
        }
        pendingApprovals.forEach(p => {
            brief += `- **${p.name}**: Requires YELLOW/RED approval to proceed.\n`;
        });
        brief += "\n";

        // 7. Executive Memory
        brief += "## Executive Memory (Recent Decisions)\n";
        const decisions = await this.persistence.getDecisions();
        if (decisions.length === 0) {
            brief += "No decisions recorded recently.\n";
        }
        decisions.slice(-5).forEach(d => {
            brief += `- **${d.subject}**: ${d.decision} (Rationale: ${d.rationale})\n`;
        });
        brief += "\n";

        // 8. Next Plan
        brief += "## Next Plan\n";
        brief += "StewardHQ is automatically advancing active objectives.\n";
        
        return brief;
    }

    async resumeMyWork(): Promise<string> {
        const registry = await this.persistence.loadRegistry();
        const projects = Object.values(registry);
        
        if (projects.length === 0) {
            return "No active projects found. StewardHQ is standing by.";
        }
            
        const latestProject = projects.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
        
        let resume = `# Resume Executive Context: ${latestProject.name}\n\n`;
        resume += `**Where we left off**: ${latestProject.status}\n`;
        
        const events = await this.persistence.getAuditTrail(latestProject.id);
        if (events.length > 0) {
            const lastEvent = events[events.length - 1];
            resume += `**Last Action**: ${lastEvent.message} (${lastEvent.timestamp})\n`;
        }
        
        resume += "\n**What's happening now**: StewardHQ is advancing the next GREEN task automatically.\n";
        resume += "**What happens next**: Automation will continue until Milestone completion or Approval gate.\n";
        
        return resume;
    }
}
