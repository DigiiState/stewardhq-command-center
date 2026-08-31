import { NextResponse } from "next/server";

/**
 * RFC 9728: OAuth Protected Resource Metadata
 */
export async function GET() {
  return NextResponse.json({
    resource: "https://stewardhq-delta.vercel.app/api/mcp/sse",
    authorization_servers: ["https://stewardhq-delta.vercel.app"],
    scopes_supported: ["openid", "email", "profile"],
    client_id_metadata_document_supported: true
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    }
  });
}
