import { Topbar } from "@/components/Topbar";
import { getTasks } from "@/lib/data/repository";

export default async function TasksPage() {
  const { mode, items: tasks } = await getTasks();
  return <div className="page"><Topbar title="Tasks & Priorities" /><section className="pageIntro"><div><div className="eyebrow">EXECUTION QUEUE</div><h2>Portfolio tasks</h2><p>The shared task ledger keeps human and AI workers on the same source of truth. <span className={`modeBadge ${mode}`}>{mode === "live" ? "LIVE" : "PREVIEW"}</span></p></div></section><section className="panel"><div className="priorityList">{tasks.length ? tasks.map((item, index) => <div className="priorityItem" key={item.id}><div className={`priorityNumber ${item.severity}`}>{index + 1}</div><div className="priorityBody"><span>{item.business}</span><strong>{item.title}</strong><p>{item.detail}</p></div><span className="statusPill active">{item.status}</span></div>) : <p className="muted">No open tasks are recorded.</p>}</div></section></div>;
}
