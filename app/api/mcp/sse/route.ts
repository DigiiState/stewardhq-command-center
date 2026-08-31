import { NextRequest } from "next/server";

const SUPABASE_MCP_URL = "https://afnefuegygoooxaaluga.supabase.co/functions/v1/stewardhq-mcp";

/**
 * MCP Unified Endpoint (Supporting SSE GET and Streamable HTTP POST)
 * Fixed: ChatGPT POSTs to this URL after handshake.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const acceptHeader = request.headers.get("Accept") || "application/json, text/event-stream";
  const body = await request.json();

  try {
    const response = await fetch(SUPABASE_MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader || "",
        "Accept": acceptHeader,
      },
      body: JSON.stringify(body),
    });

    const responseHeaders = new Headers();
    if (response.headers.has("www-authenticate")) {
      responseHeaders.set("www-authenticate", response.headers.get("www-authenticate")!);
    }
    responseHeaders.set("Content-Type", response.headers.get("Content-Type") || "text/plain");
    responseHeaders.set("Cache-Control", "no-cache");
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const responseHeaders = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // 1. Send Endpoint message (point to self for POSTs)
      const endpointMsg = {
        type: "endpoint",
        url: "https://stewardhq-delta.vercel.app/api/mcp/sse"
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
// force rebuild v32
