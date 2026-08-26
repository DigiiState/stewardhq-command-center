import { Topbar } from "@/components/Topbar";
import { getAgents } from "@/lib/data/repository";

export default async function AgentsPage() {
  const { mode, items: agents } = await getAgents();
  return <div className="page"><Topbar title="AI Workforce" /><section className="pageIntro"><div><div className="eyebrow">DIGITAL WORKFORCE</div><h2>Agents</h2><p>Manage AI workers like employees: role, assignment, authority, status and exceptions. <span className={`modeBadge ${mode}`}>{mode === "live" ? "LIVE" : "PREVIEW"}</span></p></div></section><section className="panel"><div className="agentTable"><div className="agentRow agentHead"><span>Agent</span><span>Business</span><span>Platform</span><span>Status</span><span>Authority</span></div>{agents.length ? agents.map((a) => <div className="agentRow" key={a.id ?? a.name}><div><strong>{a.name}</strong><small>{a.task}</small></div><span>{a.business}</span><span>{a.platform}</span><span className={`agentStatus ${a.status.toLowerCase()}`}>{a.status}</span><strong>L{a.authority}</strong></div>) : <p className="muted">No AI workers are registered yet.</p>}</div></section></div>;
}
