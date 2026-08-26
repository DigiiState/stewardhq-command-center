import { Topbar } from "@/components/Topbar";
import { getReviews } from "@/lib/data/repository";
import { reviewTaskResult } from "./actions";

function stamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

export default async function ReviewsPage() {
  const { mode, items } = await getReviews();
  const submitted = items.filter((item) => item.reviewStatus === "submitted");
  const history = items.filter((item) => item.reviewStatus !== "submitted");

  return (
    <div className="page">
      <Topbar title="Review Center" />
      <section className="pageIntro">
        <div>
          <div className="eyebrow">OWNER REVIEW GATE</div>
          <h2>Agent deliverables</h2>
          <p>AI work stops here for human verification. Accept closes the task; return for revision puts it back into the execution queue. <span className={`modeBadge ${mode}`}>{mode === "live" ? "LIVE" : "PREVIEW"}</span></p>
        </div>
      </section>

      <div className="reviewStack">
        {submitted.length ? submitted.map((item) => (
          <article className="reviewCard" key={item.id}>
            <div className="reviewMeta">
              <span>{item.business}</span>
              <span>{item.provider} · {stamp(item.createdAt)}</span>
            </div>
            <h3>{item.title}</h3>
            <p className="reviewSummary">{item.summary}</p>
            {item.content ? <div className="deliverable"><pre>{item.content}</pre></div> : <div className="configNotice">This historical result contains a summary but no durable body. New submissions are required to store the full deliverable.</div>}
            {mode === "live" && (
              <form action={reviewTaskResult} className="reviewActions">
                <input type="hidden" name="resultId" value={item.id} />
                <button className="primaryButton" name="decision" value="accept" type="submit">Accept & close task</button>
                <button className="dangerButton" name="decision" value="revise" type="submit">Return for revision</button>
              </form>
            )}
          </article>
        )) : <section className="panel"><p className="muted">No agent deliverables are waiting for review.</p></section>}

        {history.length > 0 && (
          <section className="panel">
            <div className="panelHeader"><div><div className="eyebrow">REVIEW HISTORY</div><h3>Recent decisions</h3></div></div>
            {history.slice(0, 12).map((item) => (
              <div className="historyRow" key={item.id}>
                <div><strong>{item.title}</strong><small>{item.business} · {item.provider}</small></div>
                <span className={`decisionBanner ${item.reviewStatus === "accepted" ? "approved" : "rejected"}`}>{item.reviewStatus.replaceAll("_", " ").toUpperCase()}</span>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
