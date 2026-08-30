import { NextRequest } from "next/server";

/**
 * MCP SSE Statless Bridge for ChatGPT
 * Connects ChatGPT (SSE) to Supabase (JSON-RPC)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || request.headers.get("Authorization")?.replace("Bearer ", "");
  
  const responseHeaders = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  const sessionId = Math.random().toString(36).substring(7);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // 1. Send Endpoint message (per MCP SSE spec)
      const endpointMsg = {
        type: "endpoint",
        url: `https://stewardhq-delta.vercel.app/api/mcp/message?sessionId=${sessionId}`
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(endpointMsg)}\n\n`));

      // 2. Keep alive heartbeat
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch (e) {
          clearInterval(interval);
        }
      }, 30000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, { headers: responseHeaders });
}
