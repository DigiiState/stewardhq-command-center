import { NextRequest, NextResponse } from "next/server";
import { ExecutionEngine } from "../../../../lib/engine/core";

export async function POST(request: NextRequest) {
    try {
        const engine = new ExecutionEngine();
        await engine.runCycle();
        
        return NextResponse.json({ message: "Engine cycle completed successfully." });
    } catch (error: any) {
        console.error("[ENGINE CYCLE] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET handler for simple webhook triggers
export async function GET() {
    try {
        const engine = new ExecutionEngine();
        await engine.runCycle();
        return NextResponse.json({ message: "Engine cycle triggered via GET." });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
