import { NextResponse } from "next/server";

/**
 * RFC 8414: OAuth Authorization Server Metadata
 */
export async function GET() {
  return NextResponse.json({
    issuer: "https://stewardhq-delta.vercel.app",
    authorization_endpoint: "https://afnefuegygoooxaaluga.supabase.co/auth/v1/authorize",
    token_endpoint: "https://afnefuegygoooxaaluga.supabase.co/auth/v1/token",
    client_id_metadata_document_supported: true,
    scopes_supported: ["openid", "profile", "email", "offline_access"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"]
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    }
  });
}
