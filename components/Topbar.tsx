import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { switchOrganization } from "@/app/actions/organization";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getWorkspaceContext } from "@/lib/tenancy/context";

function initials(name: string | null) {
  if (!name) return "SH";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SH";
}

export async function Topbar({ title = "Executive Command Center" }: { title?: string }) {
  const liveAuth = isSupabaseConfigured();
  const workspace = await getWorkspaceContext();

  if (liveAuth && workspace.userId && !workspace.active) redirect("/onboarding");

  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">STEWARDHQ</div>
        <h1>{title}</h1>
      </div>
      <div className="topActions">
        {workspace.mode === "live" && workspace.active && (
          workspace.memberships.length > 1 ? (
            <form action={switchOrganization} className="workspaceSwitcher">
              <select name="organizationId" defaultValue={workspace.active.organizationId} aria-label="Active StewardHQ workspace">
                {workspace.memberships.map((item) => (
                  <option key={item.organizationId} value={item.organizationId}>{item.organizationName}</option>
                ))}
              </select>
              <button className="quietButton" type="submit">Switch</button>
            </form>
          ) : (
            <div className="workspaceBadge" title={`Role: ${workspace.active.role}`}>
              <span className="statusDot good" />
              {workspace.active.organizationName}
            </div>
          )
        )}
        <button className="iconButton" aria-label="Notifications">•</button>
        <div className="avatar">{initials(workspace.profileName)}</div>
        {liveAuth && <form action={signOut}><button className="quietButton signOutButton" type="submit">Sign out</button></form>}
      </div>
    </header>
  );
}
