import { notFound } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { getAgents, getBusinessBySlug } from "@/lib/data/repository";

export default async function BusinessDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ item: business, mode }, agentResult] = await Promise.all([
    getBusinessBySlug(slug),
    getAgents(),
  ]);
  if (!business) notFound();
  const team = agentResult.items.filter((a) => a.business === business.name || a.business === business.shortName);
  return (
    <div className="page">
      <Topbar title={business.name} />
      <section className="businessHero">
        <div><div className="eyebrow">BUSINESS COMMAND CENTER</div><h2>{business.name}</h2><p>{business.description}</p><span className={`modeBadge ${mode}`}>{mode === "live" ? "LIVE" : "PREVIEW"}</span></div>
        <div className="heroHealth"><span>Health</span><strong>{business.health ?? "—"}</strong><small>{business.health === null ? "not measured" : "/100"}</small></div>
      </section>
      <section className="metricGrid detailMetrics">
        <div className="metricCard"><span>Status</span><strong className="textMetric">{business.status}</strong><small>operating state</small></div>
        <div className="metricCard"><span>{business.metricLabel}</span><strong>{business.metricValue}</strong><small>live operating ledger</small></div>
        <div className="metricCard"><span>Priority</span><strong className="textMetric">{business.priority}</strong><small>portfolio importance</small></div>
        <div className="metricCard"><span>Approvals</span><strong>{business.alerts}</strong><small>pending decisions</small></div>
      </section>
      <div className="twoColumn">
        <section className="panel"><div className="panelHeader"><div><div className="eyebrow">EXECUTION</div><h3>Operating ledger</h3></div></div><p className="muted">Projects and task progress now come from Supabase in live mode. The next connection adds project-specific execution timelines here.</p></section>
        <section className="panel"><div className="panelHeader"><div><div className="eyebrow">AI TEAM</div><h3>Assigned workforce</h3></div></div>{team.length ? team.map((a) => <div className="agentMini" key={a.id ?? a.name}><div><strong>{a.name}</strong><span>{a.platform}</span></div><span className={`agentStatus ${a.status.toLowerCase()}`}>{a.status}</span></div>) : <p className="muted">No agents are assigned to this business in the live registry yet.</p>}</section>
      </div>
      <section className="panel"><div className="panelHeader"><div><div className="eyebrow">EXECUTIVE MEMORY</div><h3>Institutional memory</h3></div></div><p className="muted">Strategy, pricing, SOPs, decisions, lessons and verified agent outputs are stored in the shared memory table rather than a single chat thread.</p></section>
    </div>
  );
}
