import { NextResponse } from "next/server";

/**
 * RFC 9728: OAuth Protected Resource Metadata
 */
export async function GET() {
  return NextResponse.json({
    resource: "https://stewardhq-delta.vercel.app/api/mcp/message",
    authorization_servers: ["https://afnefuegygoooxaaluga.supabase.co/auth/v1"],
    scopes_supported: ["openid", "email", "profile"],
    client_id_metadata_document_supported: false
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    }
  });
}
