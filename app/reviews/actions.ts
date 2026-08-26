"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireActiveWorkspace } from "@/lib/tenancy/context";

export async function reviewTaskResult(formData: FormData) {
  if (!isSupabaseConfigured()) return;

  const resultId = String(formData.get("resultId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!resultId || !["accept", "revise"].includes(decision)) return;

  const workspace = await requireActiveWorkspace();
  const organizationId = workspace.active!.organizationId;
  const userId = workspace.userId!;
  const supabase = await createClient();

  const { data: result, error: resultError } = await supabase
    .from("task_results")
    .select("id,task_id,summary")
    .eq("organization_id", organizationId)
    .eq("id", resultId)
    .maybeSingle();
  if (resultError) throw new Error(`Unable to load result: ${resultError.message}`);
  if (!result) return;

  const accepted = decision === "accept";
  const now = new Date().toISOString();
  const { error: reviewError } = await supabase
    .from("task_results")
    .update({
      review_status: accepted ? "accepted" : "revision_requested",
      reviewed_by: userId,
      reviewed_at: now,
    })
    .eq("organization_id", organizationId)
    .eq("id", resultId);
  if (reviewError) throw new Error(`Unable to save review: ${reviewError.message}`);

  const { error: taskError } = await supabase
    .from("tasks")
    .update({
      status: accepted ? "done" : "ready",
      completed_at: accepted ? now : null,
    })
    .eq("organization_id", organizationId)
    .eq("id", result.task_id);
  if (taskError) throw new Error(`Unable to update task: ${taskError.message}`);

  const { error: auditError } = await supabase.from("audit_log").insert({
    organization_id: organizationId,
    actor_type: "human",
    actor_id: userId,
    action: accepted ? "result.accepted" : "result.revision_requested",
    entity_type: "task_result",
    entity_id: resultId,
    payload: { task_id: result.task_id, summary: result.summary },
  });
  if (auditError) throw new Error(`Review saved, but audit logging failed: ${auditError.message}`);

  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/reviews");
}
