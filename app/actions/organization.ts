"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE, getWorkspaceContext } from "@/lib/tenancy/context";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function createOrganization(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/");

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 100) {
    redirect("/onboarding?error=Enter%20a%20workspace%20name%20between%202%20and%20100%20characters");
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ? String(claimsData.claims.sub) : null;
  if (claimsError || !userId) redirect("/login");

  // Recovery path: if organization creation succeeded previously but membership creation did not,
  // reuse the owned organization instead of leaving a duplicate orphan workspace.
  const { data: existingOwned } = await supabase
    .from("organizations")
    .select("id,name,slug")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let organization = existingOwned;

  if (!organization) {
    const base = slugify(name) || "workspace";
    const slug = `${base}-${crypto.randomUUID().slice(0, 6)}`;
    const { data, error } = await supabase
      .from("organizations")
      .insert({ name, slug, owner_user_id: userId, plan_key: "internal" })
      .select("id,name,slug")
      .single();

    if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
    organization = data;
  }

  const { error: membershipError } = await supabase.from("organization_members").upsert({
    organization_id: organization.id,
    user_id: userId,
    role: "owner",
    status: "active",
  }, { onConflict: "organization_id,user_id" });

  if (membershipError) {
    redirect(`/onboarding?error=${encodeURIComponent(membershipError.message)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organization.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  await supabase.from("audit_log").insert({
    organization_id: organization.id,
    actor_type: "human",
    actor_id: userId,
    action: "organization.created",
    entity_type: "organization",
    entity_id: organization.id,
    payload: { name: organization.name, slug: organization.slug },
  });

  redirect("/");
}

export async function switchOrganization(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  if (!organizationId) return;

  const context = await getWorkspaceContext();
  const allowed = context.memberships.some((item) => item.organizationId === organizationId);
  if (!allowed) throw new Error("You do not have access to that workspace.");

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  redirect("/");
}
