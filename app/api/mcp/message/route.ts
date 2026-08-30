import { NextRequest, NextResponse } from "next/server";

const SUPABASE_MCP_URL = "https://afnefuegygoooxaaluga.supabase.co/functions/v1/stewardhq-mcp";

/**
 * MCP Message Proxy
 * Forwards ChatGPT messages to Supabase Stateless MCP
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const acceptHeader = request.headers.get("Accept") || "application/json, text/event-stream";
  const body = await request.json();

  console.log(`[MCP Proxy] Forwarding message: ${body.method}`);

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

    const contentType = response.headers.get("Content-Type");
    
    if (!response.ok) {
      const errorText = await response.text();
      return new Response(errorText, { 
          status: response.status,
          headers: { "Content-Type": contentType || "text/plain" }
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (e: any) {
    console.error(`[MCP Proxy] Error: ${e.message}`);
    return new Response(e.message, { status: 500 });
  }
}
