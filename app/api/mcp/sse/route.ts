import { NextRequest } from "next/server";
import { server } from "@/lib/mcp/server";

// Using a module-level global map for active servers
// This is ephemeral and resets on cold start!
// For high-load, we'd use Redis or similar.
const activeServers = new Map<string, any>();

/**
 * Custom MCP SSE Handler
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || request.headers.get("Authorization")?.replace("Bearer ", "");
  const expectedToken = process.env.CHATGPT_MCP_TOKEN;
  
  if (expectedToken && token !== expectedToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sessionId = Math.random().toString(36).substring(7);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const transport = {
        onmessage: undefined as any,
        onclose: undefined as any,
        async send(message: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
        },
        async start() {},
        async close() {
          activeServers.delete(sessionId);
          controller.close();
        }
      };

      activeServers.set(sessionId, transport);
      await server.connect(transport as any);

      // Send initial endpoint message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: "endpoint",
        url: `/api/mcp/sse?sessionId=${sessionId}`
      })}\n\n`));
    },
    cancel() {
      activeServers.delete(sessionId);
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

/**
 * Handle incoming JSON-RPC messages from the client
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId || !activeServers.has(sessionId)) {
    return new Response("Invalid session", { status: 400 });
  }

  const transport = activeServers.get(sessionId)!;
  const message = await request.json();

  if (transport.onmessage) {
      await transport.onmessage(message);
  }

  return new Response("OK", { status: 200 });
}
