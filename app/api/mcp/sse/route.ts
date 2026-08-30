import { NextRequest } from "next/server";
import { server } from "@/lib/mcp/server";
import { activeTransports } from "@/lib/mcp/state";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

/**
 * Custom Web-standard SSE Transport for MCP
 * Compatible with Next.js App Router and Edge Runtime
 */
class WebSseTransport {
  private controller: ReadableStreamDefaultController | null = null;
  public onmessage?: (message: JSONRPCMessage) => void;
  public onclose?: () => void;
  public onerror?: (error: Error) => void;

  constructor(private sessionId: string) {}

  async start(controller: ReadableStreamDefaultController) {
    this.controller = controller;
    const encoder = new TextEncoder();
    
    // Send initial endpoint message as per MCP SSE spec
    const endpointMessage = {
      type: "endpoint",
      url: `/api/mcp/message?sessionId=${this.sessionId}`
    };
    this.controller.enqueue(encoder.encode(`data: ${JSON.stringify(endpointMessage)}\n\n`));
  }

  async send(message: JSONRPCMessage) {
    if (!this.controller) throw new Error("Transport not started");
    const encoder = new TextEncoder();
    this.controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
  }

  async close() {
    this.onclose?.();
    this.controller = null;
  }

  // Handle incoming message from POST route
  async handleMessage(message: JSONRPCMessage) {
    this.onmessage?.(message);
  }
}

export async function GET(request: NextRequest) {
  console.log("[MCP SSE] Connection requested.");

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || request.headers.get("Authorization")?.replace("Bearer ", "");
  const expectedToken = process.env.CHATGPT_MCP_TOKEN;
  
  if (expectedToken && token !== expectedToken) {
    console.error("[MCP SSE] Unauthorized.");
    return new Response("Unauthorized", { status: 401 });
  }

  const sessionId = Math.random().toString(36).substring(7);
  const transport = new WebSseTransport(sessionId);
  activeTransports.set(sessionId, transport as any);

  const stream = new ReadableStream({
    async start(controller) {
      await transport.start(controller);
      await server.connect(transport as any);
      console.log(`[MCP SSE] Session ${sessionId} connected.`);
    },
    cancel() {
      activeTransports.delete(sessionId);
      console.log(`[MCP SSE] Session ${sessionId} cancelled.`);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId || !activeTransports.has(sessionId)) {
    return new Response("Invalid session", { status: 400 });
  }

  const transport = activeTransports.get(sessionId)! as any;
  const message = await request.json();

  await transport.handleMessage(message);
  return new Response("OK", { status: 200 });
}
