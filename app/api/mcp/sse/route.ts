import { NextRequest } from "next/server";
import { server } from "@/lib/mcp/server";
import { activeTransports } from "@/lib/mcp/state";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

/**
 * MCP SSE Ingress for ChatGPT
 * Handles GET (connection) and POST (messages)
 */
export async function GET(request: NextRequest) {
  console.log("[MCP SSE] Connection requested.");

  // AUTH: Check for token in Header or Query Param
  const authHeader = request.headers.get("Authorization");
  const { searchParams } = new URL(request.url);
  const queryToken = searchParams.get("token") || searchParams.get("apiKey");
  const expectedToken = process.env.CHATGPT_MCP_TOKEN;
  
  // ALLOW GET without token for discovery, but real tools will require auth on POST
  // OR strictly require it in query param if missing in header
  if (expectedToken && !authHeader?.includes(expectedToken) && queryToken !== expectedToken) {
    // If it's a browser request (not ChatGPT), we might want to return 401
    // But for ChatGPT, we check if we can be more flexible
    console.warn("[MCP SSE] Unauthorized or missing token on GET. Proceeding for discovery.");
  }

  const sessionId = Math.random().toString(36).substring(7);
  
  // Custom Response Mock to satisfy SSEServerTransport without crashing on writeHead
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;

  const resMock = {
    writeHead: (status: number, headers: any) => {
        console.log(`[MCP SSE] Transport headers initialized: ${status}`);
    },
    write: (data: string) => {
        if (controller) {
            controller.enqueue(encoder.encode(data));
        }
    },
    end: () => {
        if (controller) {
            controller.close();
        }
    },
    on: (event: string, cb: any) => {
        // Handle 'close' etc
    }
  };

  const transport = new SSEServerTransport(`/api/mcp/message?sessionId=${sessionId}`, resMock as any);
  activeTransports.set(sessionId, transport);

  const stream = new ReadableStream({
    async start(ctrl) {
      controller = ctrl;
      await server.connect(transport);
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

/**
 * POST /api/mcp/sse is often called by some clients for messages.
 * We also have /api/mcp/message. We'll support both for robustness.
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId || !activeTransports.has(sessionId)) {
    return new Response("Invalid session", { status: 400 });
  }

  const transport = activeTransports.get(sessionId)!;
  
  // AUTH: Mandatory on POST
  const authHeader = request.headers.get("Authorization");
  const expectedToken = process.env.CHATGPT_MCP_TOKEN;
  if (expectedToken && !authHeader?.includes(expectedToken)) {
    return new Response("Unauthorized", { status: 401 });
  }

  await transport.handlePostMessage(request as any, new Response() as any);
  return new Response("OK", { status: 200 });
}
