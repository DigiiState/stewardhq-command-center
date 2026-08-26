import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { getBusinesses } from "@/lib/data/repository";

export default async function BusinessesPage() {
  const { mode, items: businesses } = await getBusinesses();
  return (
    <div className="page">
      <Topbar title="Portfolio" />
      <section className="pageIntro"><div><div className="eyebrow">PORTFOLIO CONTROL</div><h2>Businesses</h2><p>One view across every operating company, venture and investment engine. <span className={`modeBadge ${mode}`}>{mode === "live" ? "LIVE" : "PREVIEW"}</span></p></div></section>
      <div className="businessCardGrid">
        {businesses.map((b) => (
          <Link className="businessCard" href={`/businesses/${b.slug}`} key={b.slug}>
            <div className="businessCardTop"><span className={`statusPill ${b.status.toLowerCase()}`}>{b.status}</span><strong className="healthScore">{b.health ?? "—"}</strong></div>
            <h3>{b.name}</h3><p>{b.description}</p>
            <div className="businessMetrics"><div><span>{b.metricLabel}</span><strong>{b.metricValue}</strong></div><div><span>Priority</span><strong>{b.priority}</strong></div><div><span>Approvals</span><strong>{b.alerts}</strong></div></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
