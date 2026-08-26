import { Topbar } from "@/components/Topbar";
import { getWorkspaceContext } from "@/lib/tenancy/context";

export default async function WorkspacesPage() {
  const context = await getWorkspaceContext();
  return (
    <div className="page">
      <Topbar title="Workspaces" />
      <section className="pageIntro">
        <div>
          <div className="eyebrow">TENANT CONTROL</div>
          <h2>Organizations</h2>
          <p>Each workspace is an isolated StewardHQ operating environment.</p>
        </div>
      </section>
      <section className="panel workspaceList">
        {context.mode === "preview" ? (
          <p className="muted">Connect Supabase to manage live workspaces.</p>
        ) : context.memberships.length ? (
          context.memberships.map((item) => (
            <div className="workspaceRow" key={item.organizationId}>
              <div>
                <strong>{item.organizationName}</strong>
                <small>{item.organizationSlug}</small>
              </div>
              <div>
                <span className="statusPill active">{item.role.toUpperCase()}</span>
                {context.active?.organizationId === item.organizationId && <span className="modeBadge live">ACTIVE</span>}
              </div>
            </div>
          ))
        ) : (
          <p className="muted">No workspace membership is active.</p>
        )}
      </section>
    </div>
  );
}
