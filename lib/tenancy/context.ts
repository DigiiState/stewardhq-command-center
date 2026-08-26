import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const ACTIVE_ORG_COOKIE = "stewardhq_org_id";

export type WorkspaceMembership = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: string;
  timezone: string;
  currencyCode: string;
};

export type WorkspaceContext = {
  mode: "live" | "preview";
  userId: string | null;
  profileName: string | null;
  active: WorkspaceMembership | null;
  memberships: WorkspaceMembership[];
};

function organizationFromRelation(value: unknown) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value === "object") return value as Record<string, unknown>;
  return null;
}

export async function getWorkspaceContext(): Promise<WorkspaceContext> {
  if (!isSupabaseConfigured()) {
    return {
      mode: "preview",
      userId: null,
      profileName: "Lydia",
      active: {
        organizationId: "preview",
        organizationName: "StewardHQ Demo Portfolio",
        organizationSlug: "preview",
        role: "owner",
        status: "active",
        timezone: "America/New_York",
        currencyCode: "USD",
      },
      memberships: [],
    };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ? String(claimsData.claims.sub) : null;
  if (claimsError || !userId) {
    return { mode: "live", userId: null, profileName: null, active: null, memberships: [] };
  }

  const [{ data: profile }, { data: membershipRows, error: membershipError }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase
      .from("organization_members")
      .select("organization_id,role,status,organizations!inner(id,name,slug,status,timezone,currency_code)")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("joined_at", { ascending: true }),
  ]);

  if (membershipError) {
    throw new Error(`Unable to load StewardHQ workspaces: ${membershipError.message}`);
  }

  const memberships: WorkspaceMembership[] = (membershipRows ?? []).flatMap((row) => {
    const organization = organizationFromRelation(row.organizations);
    if (!organization) return [];
    return [{
      organizationId: String(organization.id),
      organizationName: String(organization.name),
      organizationSlug: String(organization.slug),
      role: String(row.role) as WorkspaceMembership["role"],
      status: String(row.status),
      timezone: String(organization.timezone ?? "America/New_York"),
      currencyCode: String(organization.currency_code ?? "USD"),
    }];
  });

  const cookieStore = await cookies();
  const requestedOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const active =
    memberships.find((item) => item.organizationId === requestedOrgId) ??
    memberships[0] ??
    null;

  return {
    mode: "live",
    userId,
    profileName: profile?.full_name ?? null,
    active,
    memberships,
  };
}

export async function requireActiveWorkspace() {
  const context = await getWorkspaceContext();
  if (context.mode === "preview") return context;
  if (!context.userId) throw new Error("Authenticated user required.");
  if (!context.active) throw new Error("NO_ACTIVE_WORKSPACE");
  return context;
}
