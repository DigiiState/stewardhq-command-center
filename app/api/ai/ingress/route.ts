import { NextRequest, NextResponse } from "next/server";
import { routeCommand } from "@/lib/ai/router";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  // 1. AUTH: Check Bearer Token
  const authHeader = request.headers.get("Authorization");
  const expectedToken = process.env.CHATGPT_MCP_TOKEN;

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const command = String(body?.command ?? body?.message ?? "").trim();
    
    if (!command) {
        return NextResponse.json({ error: "Command is required" }, { status: 400 });
    }

    console.log(`[AI INGRESS] Received from ChatGPT: ${command}`);

    // 2. EXECUTE: Use the existing router logic
    const result = await routeCommand(command);

    // 3. LOG: Use service role for logging since we don't have a user session
    const supabase = createServiceClient();
    // Default to the authoritative Lydia Portfolio Org for ChatGPT commands
    const organizationId = "530962bb-b554-4ddb-ab5c-8eaa3d5220a8";

    const { data: run } = await supabase.from("agent_runs").insert({
        organization_id: organizationId,
        provider: "chatgpt-ingress",
        status: "completed",
        input_summary: command.slice(0, 1000),
        output_summary: String(result.output ?? "").slice(0, 3000),
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
    }).select("id").single();

    if (run) {
        await supabase.from("audit_log").insert({
            organization_id: organizationId,
            actor_type: "system",
            actor_id: "chatgpt",
            action: "ai.ingress",
            entity_type: "agent_run",
            entity_id: run.id,
            payload: { command_preview: command.slice(0, 300) },
        });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("[AI INGRESS] Error:", error.message);
    return NextResponse.json({ error: "Ingress failed", detail: error.message }, { status: 500 });
  }
}
