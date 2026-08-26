import { NextRequest, NextResponse } from "next/server";
import { ImplementationGateway } from "../../../../lib/engine/gateway";

export async function POST(request: NextRequest) {
    try {
        const spec = await request.json();
        const gateway = new ImplementationGateway();
        const project = await gateway.ingestSpecification(spec);
        
        return NextResponse.json({ 
            message: `Project created: ${project.name}`,
            project_id: project.id 
        });
    } catch (error: any) {
        console.error("[ENGINE INGEST] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
