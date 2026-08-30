import { NextRequest } from "next/server";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { server } from "@/lib/mcp/server";
import { activeTransports } from "@/lib/mcp/state";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const expectedToken = process.env.CHATGPT_MCP_TOKEN;
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sessionId = Math.random().toString(36).substring(7);
  const transport = new SSEServerTransport(`/api/mcp/message?sessionId=${sessionId}`, {
      // Stub
  } as any);

  activeTransports.set(sessionId, transport);
  await server.connect(transport);

  const stream = new ReadableStream({
    start(controller) {
      transport.onmessage = (message) => {
        controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
      };
      transport.onclose = () => {
        activeTransports.delete(sessionId);
        controller.close();
      };
    },
    cancel() {
      activeTransports.delete(sessionId);
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
