import { NextRequest } from "next/server";
import { activeTransports } from "@/lib/mcp/state";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId || !activeTransports.has(sessionId)) {
    console.error(`[MCP Message] Session ${sessionId} not found.`);
    return new Response("Invalid session", { status: 400 });
  }

  const transport = activeTransports.get(sessionId)! as any;
  const message = await request.json();

  try {
    await transport.handleMessage(message);
    return new Response("OK", { status: 200 });
  } catch (e: any) {
    console.error(`[MCP Message] Error: ${e.message}`);
    return new Response(e.message, { status: 500 });
  }
}
