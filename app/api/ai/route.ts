import { NextRequest, NextResponse } from "next/server";
import { routeCommand, chooseRoute } from "@/lib/ai/router";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { requireActiveWorkspace } from "@/lib/tenancy/context";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = String(body?.message ?? "").trim();
  console.log(`[AI ROUTE] Received command: ${message}`);
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  if (message.length > 10000) return NextResponse.json({ error: "Command is too long" }, { status: 413 });

  const plannedRoute = chooseRoute(message);

  try {
    const result = await routeCommand(message);

    if (isSupabaseConfigured()) {
      const workspace = await requireActiveWorkspace();
      const organizationId = workspace.active!.organizationId;
      const userId = workspace.userId!;
      const supabase = await createClient();

      const { data: run, error: runError } = await supabase.from("agent_runs").insert({
        organization_id: organizationId,
        provider: result.route,
        status: "completed",
        input_summary: message.slice(0, 1000),
        output_summary: String(result.output ?? "").slice(0, 3000),
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }).select("id").single();

      if (runError) throw new Error(`AI run logging failed: ${runError.message}`);

      const { error: auditError } = await supabase.from("audit_log").insert({
        organization_id: organizationId,
        actor_type: "human",
        actor_id: userId,
        action: "ai.command",
        entity_type: "agent_run",
        entity_id: run.id,
        payload: { route: result.route, command_preview: message.slice(0, 300) },
      });

      if (auditError) throw new Error(`AI audit logging failed: ${auditError.message}`);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    if (isSupabaseConfigured()) {
      try {
        const workspace = await requireActiveWorkspace();
        const organizationId = workspace.active!.organizationId;
        const supabase = await createClient();
        await supabase.from("agent_runs").insert({
          organization_id: organizationId,
          provider: plannedRoute,
          status: "failed",
          input_summary: message.slice(0, 1000),
          error_message: error instanceof Error ? error.message.slice(0, 1500) : "Unknown routing error",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
      } catch (loggingError) {
        console.error("Failed to log agent run", loggingError);
      }
    }

    return NextResponse.json({ error: "AI routing failed" }, { status: 500 });
  }
}
