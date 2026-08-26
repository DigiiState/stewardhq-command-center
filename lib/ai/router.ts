import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { getExecutiveContext } from "@/lib/data/repository";

export type Route = "openai" | "claude" | "accio";

export function chooseRoute(message: string): Route {
  const text = message.toLowerCase();
  const technical = ["code", "audit", "debug", "architecture", "security", "database", "deploy", "api", "bug", "technical"];
  const execution = ["research", "find leads", "monitor", "schedule", "accio", "run agent", "assign agent", "execute", "collect", "resume", "brief", "priority"];
  if (technical.some((word) => text.includes(word))) return "claude";
  if (execution.some((word) => text.includes(word))) return "accio";
  return "openai";
}

function compactContext(context: Awaited<ReturnType<typeof getExecutiveContext>>) {
  return JSON.stringify(context, null, 2).slice(0, 30000);
}

export async function routeCommand(message: string) {
  const route = chooseRoute(message);
  const context = await getExecutiveContext();
  const operatingContext = `\n\nSTEWARDHQ CONTEXT (${context.mode.toUpperCase()}):\n${compactContext(context)}`;

  if (route === "claude") {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { route, output: "Technical command identified for Claude. Add ANTHROPIC_API_KEY and ANTHROPIC_MODEL to activate live technical routing." };
    }
    if (!process.env.ANTHROPIC_MODEL) {
      return { route, output: "Claude is connected, but ANTHROPIC_MODEL is not set. Add the current model ID you want StewardHQ to use." };
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const result = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL,
      max_tokens: 1200,
      system: "You are the CTO and independent technical auditor inside StewardHQ. Use the supplied Business OS context as the source of truth for internal operating facts. Identify technical risk, separate verified facts from assumptions, and finish with the next executable action.",
      messages: [{ role: "user", content: `${message}${operatingContext}` }],
    });
    const text = result.content.find((content) => content.type === "text");
    return { route, output: text && "text" in text ? text.text : "Claude completed the technical review." };
  }

  if (route === "accio") {
    console.log(`[AI ROUTER] Routing to Accio Bridge: ${process.env.ACCIO_BRIDGE_URL}`);
    if (!process.env.ACCIO_BRIDGE_URL) {
      return { route, output: "Execution command identified for Accio Work. The shared task/run ledger is ready, but the Accio bridge is not connected yet." };
    }

    const response = await fetch(process.env.ACCIO_BRIDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.ACCIO_BRIDGE_TOKEN
          ? { Authorization: `Bearer ${process.env.ACCIO_BRIDGE_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        source: "stewardhq",
        command: message,
        context,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return { route, output: `Accio bridge returned ${response.status}. The command was not certified as executed.` };
    }

    const data = await response.json().catch(() => ({}));
    return { 
      route, 
      output: data.response ?? data.output ?? data.message ?? "Accio accepted the command.",
      metadata: data
    };
  }

  if (process.env.OPENAI_API_KEY) {
    if (!process.env.OPENAI_MODEL) {
      return { route: "openai" as const, output: "OpenAI is connected, but OPENAI_MODEL is not set. Choose the current production model ID before enabling live executive reasoning." };
    }
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL,
      reasoning: { effort: "medium" },
      instructions: "You are the executive strategy and operating AI for StewardHQ. Use the supplied Business OS context as the source of truth for internal operating facts. Be concise. Separate facts from assumptions. Identify the decision, risk, owner, and next action. Never imply an external action occurred unless a tool or system result confirms it.",
      input: `${message}${operatingContext}`,
    });
    return { route: "openai" as const, output: response.output_text };
  }

  return { route, output: "Executive command identified for OpenAI. Add OPENAI_API_KEY to activate live reasoning." };
}
