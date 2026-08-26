import { NextRequest, NextResponse } from "next/server";
import { BriefGenerator } from "../../../../lib/engine/brief";
import { PersistenceEngine } from "../../../../lib/engine/persistence";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const prompt = String(body?.command ?? "").toLowerCase();
        
        const persistence = new PersistenceEngine();
        const gen = new BriefGenerator();
        
        const responseData: any = {
            response: "Command received.",
            state: "COMPLETE",
            authority: "GREEN",
            founder_escalation: null,
            next_step: null,
            accessible_business_scope: ["Portfolio"]
        };

        if (prompt.includes("resume")) {
            responseData.response = await gen.resumeMyWork();
            responseData.next_step = "Continuing execution loop...";
        } else if (prompt.includes("brief")) {
            responseData.response = await gen.generateFounderBrief();
        } else if (prompt.includes("priority") || prompt.includes("portfolio")) {
            const registry = await persistence.loadRegistry();
            const active = Object.values(registry).filter(p => !["COMPLETED", "FAILED"].includes(p.status));
            if (active.length > 0) {
                const top = active[0];
                responseData.response = `The highest priority objective is **${top.name}** (${top.status}).`;
                responseData.next_step = "Monitoring for material changes.";
            } else {
                responseData.response = "No active projects requiring execution.";
            }
        } else {
            responseData.response = "StewardHQ received your message. I am analyzing the best way to execute this across the workforce.";
            responseData.state = "PLANNING";
        }

        return NextResponse.json(responseData);
    } catch (error: any) {
        console.error("[ENGINE ASK] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
