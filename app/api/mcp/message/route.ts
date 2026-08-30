import { NextRequest } from "next/server";
import { activeTransports } from "@/lib/mcp/state";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  // AUTH: Mandatory on message POST
  const authHeader = request.headers.get("Authorization");
  const expectedToken = process.env.CHATGPT_MCP_TOKEN;
  if (expectedToken && !authHeader?.includes(expectedToken)) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!sessionId || !activeTransports.has(sessionId)) {
    console.error(`[MCP Message] Session ${sessionId} not found.`);
    return new Response("Invalid session", { status: 400 });
  }

  const transport = activeTransports.get(sessionId)!;
  
  // Note: We need a real response object to pass to handlePostMessage
  // In Next.js App Router, we just need to pass the request and let it finish.
  await transport.handlePostMessage(request as any, new Response() as any);

  return new Response("OK", { status: 200 });
}
