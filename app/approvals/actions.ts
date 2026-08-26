"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireActiveWorkspace } from "@/lib/tenancy/context";

export async function decideApproval(formData: FormData) {
  if (!isSupabaseConfigured()) return;

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!id || !["approved", "rejected"].includes(status)) return;

  const workspace = await requireActiveWorkspace();
  const organizationId = workspace.active!.organizationId;
  const userId = workspace.userId!;
  const supabase = await createClient();

  const { data: approval, error } = await supabase
    .from("approvals")
    .update({
      status,
      decided_at: new Date().toISOString(),
      decided_by: userId,
      notes,
    })
    .eq("organization_id", organizationId)
    .eq("id", id)
    .eq("status", "pending")
    .select("id,title,business_id,organization_id")
    .maybeSingle();

  if (error) throw new Error(`Approval update failed: ${error.message}`);
  if (!approval) return;

  const { error: auditError } = await supabase.from("audit_log").insert({
    organization_id: organizationId,
    actor_type: "human",
    actor_id: userId,
    action: `approval.${status}`,
    entity_type: "approval",
    entity_id: id,
    payload: { title: approval.title, business_id: approval.business_id, notes },
  });

  if (auditError) throw new Error(`Approval saved, but audit logging failed: ${auditError.message}`);

  revalidatePath("/");
  revalidatePath("/approvals");
}
