import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "stewardhq",
    supabaseConfigured: isSupabaseConfigured(),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    accioBridgeConfigured: Boolean(process.env.ACCIO_BRIDGE_URL),
  });
}
