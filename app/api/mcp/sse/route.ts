import { NextRequest, NextResponse } from "next/server";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { server } from "@/lib/mcp/server";

let transport: SSEServerTransport | null = null;

export async function GET(request: NextRequest) {
  console.log("[MCP SSE] Connection requested.");

  // AUTH: Check for CHATGPT_MCP_TOKEN
  const authHeader = request.headers.get("Authorization");
  const expectedToken = process.env.CHATGPT_MCP_TOKEN;
  
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    console.error("[MCP SSE] Unauthorized connection attempt.");
    return new Response("Unauthorized", { status: 401 });
  }

  // Create transport
  const response = new NextResponse();
  transport = new SSEServerTransport("/api/mcp/sse", response as any);

  // Connect server to transport
  await server.connect(transport);

  console.log("[MCP SSE] Server connected to transport.");
  return response;
}

export async function POST(request: NextRequest) {
  console.log("[MCP SSE] Message received.");

  if (!transport) {
    console.error("[MCP SSE] No active transport session.");
    return new Response("No active session", { status: 400 });
  }

  // AUTH: Check for CHATGPT_MCP_TOKEN
  const authHeader = request.headers.get("Authorization");
  const expectedToken = process.env.CHATGPT_MCP_TOKEN;
  
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    console.error("[MCP SSE] Unauthorized message attempt.");
    return new Response("Unauthorized", { status: 401 });
  }

  // Pass message to transport
  await transport.handlePostMessage(request as any, NextResponse as any);

  return new Response("OK", { status: 200 });
}
