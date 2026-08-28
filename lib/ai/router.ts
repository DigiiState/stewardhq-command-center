import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { getExecutiveContext } from "@/lib/data/repository";
import { ImplementationGateway } from "@/lib/engine/gateway";
import { AuthorityLevel } from "@/lib/engine/types";

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

  if (route === "accio") {
    console.log(`[AI ROUTER] Routing to Accio workforce via Task creation.`);
    
    // GREEN Fix: Create an asynchronous task in StewardHQ instead of just a synchronous fetch
    const gateway = new ImplementationGateway();
    const project = await gateway.ingestSpecification({
      name: `AI Execution: ${message.slice(0, 50)}...`,
      description: message,
      business_id: null,
      authority_level: AuthorityLevel.GREEN,
      dod: "Accio result submitted to StewardHQ.",
      milestones: [
        {
          title: "Execution",
          description: "Perform the requested action.",
          tasks: [
            {
              title: "Execute Command",
              description: message,
              authority_level: AuthorityLevel.GREEN
            }
          ]
        }
      ]
    });

    return { 
      route, 
      output: `Command accepted. Accio workforce has been assigned task in Project: ${project.name} (${project.id}). Monitoring for result.`,
      project_id: project.id
    };
  }

  if (route === "claude") {
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
