import Link from "next/link";
import { AICommand } from "@/components/AICommand";
import { Topbar } from "@/components/Topbar";
import { getDashboardSnapshot } from "@/lib/data/repository";

function healthClass(score: number | null) {
  if (score === null) return "warn";
  if (score >= 85) return "good";
  if (score >= 72) return "warn";
  return "risk";
}

function todayLabel(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(new Date());
}

function daypart(timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date()));
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export default async function Home() {
  const snapshot = await getDashboardSnapshot();
  const { businesses, agents, approvals, tasks, reviews, activity, mode, workspace } = snapshot;
  const timeZone = workspace.active?.timezone ?? "America/New_York";
  const firstName = workspace.profileName?.trim().split(/\s+/)[0] ?? null;
  const working = agents.filter((agent) => agent.status.toLowerCase() === "working").length;
  const pendingApprovals = approvals.filter((approval) => approval.status === "PENDING");
  const scored = businesses.filter((business) => business.health !== null);
  const portfolioHealth = scored.length
    ? Math.round(scored.reduce((sum, business) => sum + (business.health ?? 0), 0) / scored.length)
    : null;
  const highAlerts = tasks.filter((task) => ["high", "critical"].includes(task.severity.toLowerCase())).length;
  const reviewQueue = reviews.filter((item) => item.reviewStatus === "submitted");

  return (
    <div className="page">
      <Topbar />
      <div className="dashboardGrid">
        <section className="contentColumn">
          <section className="heroCard">
            <div>
              <div className="eyebrow">{todayLabel(timeZone).toUpperCase()}</div>
              <h2>Good {daypart(timeZone)}{firstName ? `, ${firstName}` : ""}.</h2>
              <p>
                {mode === "live"
                  ? `${pendingApprovals.length} approval${pendingApprovals.length === 1 ? "" : "s"} and ${tasks.length} open task${tasks.length === 1 ? "" : "s"} are in ${workspace.active?.organizationName ?? "this workspace"}.`
                  : "Preview mode is active. Connect Supabase to replace the sample dashboard data with your live operating ledger."}
              </p>
              <span className={`modeBadge ${mode}`}>{mode === "live" ? "LIVE DATA" : "PREVIEW DATA"}</span>
            </div>
            <div className="portfolioScore">
              <span>Portfolio Health</span>
              <strong>{portfolioHealth ?? "—"}</strong>
              <small>{portfolioHealth === null ? "not measured" : "/ 100"}</small>
            </div>
          </section>

          <section className="metricGrid">
            <div className="metricCard"><span>Businesses</span><strong>{businesses.length}</strong><small>across the portfolio</small></div>
            <div className="metricCard"><span>Agents Working</span><strong>{working}</strong><small>{agents.length} registered</small></div>
            <div className="metricCard"><span>Approvals</span><strong>{pendingApprovals.length}</strong><small>awaiting you</small></div>
            <div className="metricCard"><span>Reviews</span><strong>{reviewQueue.length}</strong><small>agent deliverables</small></div>
          </section>

          <section className="panel">
            <div className="panelHeader"><div><div className="eyebrow">EXECUTIVE FOCUS</div><h3>Open priorities</h3></div><Link href="/tasks">View tasks →</Link></div>
            <div className="priorityList">
              {tasks.length ? tasks.slice(0, 5).map((item, index) => (
                <div className="priorityItem" key={item.id}>
                  <div className={`priorityNumber ${item.severity}`}>{index + 1}</div>
                  <div className="priorityBody"><span>{item.business}</span><strong>{item.title}</strong><p>{item.detail}</p></div>
                  <span className="statusPill active">{item.status}</span>
                </div>
              )) : <p className="muted">No open tasks are recorded.</p>}
            </div>
          </section>

          <section className="panel">
            <div className="panelHeader"><div><div className="eyebrow">PORTFOLIO</div><h3>Business health</h3></div><Link href="/businesses">Open portfolio →</Link></div>
            <div className="businessTable">
              {businesses.map((business) => (
                <Link href={`/businesses/${business.slug}`} className="businessRow" key={business.slug}>
                  <div><strong>{business.shortName}</strong><small>{business.status}</small></div>
                  <div className="healthCell"><span className={`statusDot ${healthClass(business.health)}`} /><strong>{business.health ?? "—"}</strong></div>
                  <div className="hideMobile">{business.metricLabel}<strong>{business.metricValue}</strong></div>
                  <div className="hideMobile">Approvals<strong>{business.alerts}</strong></div>
                  <span>›</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panelHeader"><div><div className="eyebrow">REVIEW QUEUE</div><h3>Agent work awaiting you</h3></div><Link href="/reviews">Open reviews →</Link></div>
            <div className="reviewPreviewList">
              {reviewQueue.length ? reviewQueue.slice(0, 3).map((item) => (
                <Link href="/reviews" className="reviewPreview" key={item.id}>
                  <div><span>{item.business} · {item.provider}</span><strong>{item.title}</strong><p>{item.summary}</p></div><span>›</span>
                </Link>
              )) : <p className="muted">No agent deliverables are waiting for review.</p>}
            </div>
          </section>

          <section className="panel">
            <div className="panelHeader"><div><div className="eyebrow">LIVE ACTIVITY</div><h3>Recent operating events</h3></div></div>
            <div className="activityList">
              {activity.length ? activity.slice(0, 6).map((item) => (
                <div className="activityRow" key={item.id}>
                  <span className="statusDot good" />
                  <div><strong>{item.action.replaceAll(".", " ")}</strong><small>{item.actor} · {item.label}</small></div>
                </div>
              )) : <p className="muted">No recent operating events are recorded.</p>}
            </div>
          </section>

          <section className="panel">
            <div className="panelHeader"><div><div className="eyebrow">APPROVAL GATE</div><h3>Needs your decision</h3></div><Link href="/approvals">Open approvals →</Link></div>
            <div className="approvalCards">
              {pendingApprovals.length ? pendingApprovals.slice(0, 2).map((approval) => (
                <article className="approvalCard" key={approval.id}>
                  <div className="approvalTop"><span>{approval.business}</span><span className={`riskBadge ${approval.risk.toLowerCase()}`}>{approval.risk}</span></div>
                  <h4>{approval.title}</h4>
                  <strong className="approvalAmount">{approval.amount}</strong>
                  <p>{approval.reason}</p>
                  <div className="approvalActions"><Link className="primaryButton buttonLink" href="/approvals">Review</Link><button className="quietButton">Ask AI</button></div>
                </article>
              )) : <p className="muted">Nothing is awaiting approval.</p>}
            </div>
          </section>
        </section>
        <AICommand />
      </div>
    </div>
  );
}
