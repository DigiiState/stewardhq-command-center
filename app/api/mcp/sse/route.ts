import { NextRequest } from "next/server";
import { server } from "@/lib/mcp/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const expectedToken = process.env.CHATGPT_MCP_TOKEN;
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const responseHeaders = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Custom simple transport for Web standard
      const transport = {
        onmessage: (message: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
        },
        onclose: () => {
          controller.close();
        },
        // We'll handle incoming messages via the POST route
        async send(message: any) {
            this.onmessage(message);
        },
        async start() {},
        async close() {
            this.onclose();
        }
      };

      await server.connect(transport as any);
      
      // Keep alive heartbeat
      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 30000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        server.close();
      });
    },
  });

  return new Response(stream, { headers: responseHeaders });
}

// Since I can't easily link POST to GET without a session manager 
// that survives cold starts (like Redis), I'll implement a 
// "stateless" MCP bridge that ChatGPT can call via POST.
