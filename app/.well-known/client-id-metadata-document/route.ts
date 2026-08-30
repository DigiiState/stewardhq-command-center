import { NextResponse } from "next/server";

/**
 * Client Identifier Metadata Document (CIMD)
 */
export async function GET() {
  return NextResponse.json({
    client_name: "ChatGPT",
    logo_uri: "https://openai.com/favicon.ico",
    policy_uri: "https://openai.com/policies/privacy-policy",
    tos_uri: "https://openai.com/policies/terms-of-use",
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    }
  });
}
