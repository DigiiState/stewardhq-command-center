import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { 
    getExecutiveContext, 
    getTasks, 
    getDecisions, 
    getBusinesses 
} from "@/lib/data/repository";
import { createServiceClient } from "@/lib/supabase/service";

export const server = new McpServer({
  name: "StewardHQ",
  version: "1.0.0",
});

// 1. Get Business Context
server.tool(
  "get_business_context",
  "Retrieve a comprehensive summary of the portfolio, businesses, and current objectives.",
  {},
  async () => {
    const context = await getExecutiveContext();
    return {
      content: [{ type: "text", text: JSON.stringify(context, null, 2) }],
    };
  }
);

// 2. Get Tasks
server.tool(
  "get_tasks",
  "Retrieve pending or active tasks for the portfolio.",
  {
    status: z.enum(["backlog", "ready", "working", "blocked", "review"]).optional(),
    business_slug: z.string().optional(),
  },
  async ({ status, business_slug }) => {
    const { items: tasks } = await getTasks();
    let filtered = tasks;
    if (status) filtered = filtered.filter(t => t.status.toLowerCase() === status.toLowerCase());
    if (business_slug) filtered = filtered.filter(t => t.business.toLowerCase().includes(business_slug.toLowerCase()));
    
    return {
      content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
    };
  }
);

// 3. Claim Task
server.tool(
  "claim_task",
  "Claim an unassigned task for execution.",
  {
    task_id: z.string().uuid(),
    agent_id: z.string().uuid(),
  },
  async ({ task_id, agent_id }) => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from("tasks")
        .update({ 
            status: "working", 
            assigned_agent_id: agent_id,
            updated_at: new Date().toISOString()
        })
        .eq("id", task_id)
        .select()
        .single();

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    return { content: [{ type: "text", text: `Task ${task_id} claimed by agent ${agent_id}.` }] };
  }
);

// 4. Update Task
server.tool(
  "update_task",
  "Update the status or detail of a task.",
  {
    task_id: z.string().uuid(),
    status: z.enum(["working", "blocked", "review", "done", "cancelled"]).optional(),
    output_summary: z.string().optional(),
  },
  async ({ task_id, status, output_summary }) => {
    const supabase = createServiceClient();
    const updates: any = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (output_summary) updates.output_summary = output_summary;
    if (status === 'done') updates.completed_at = new Date().toISOString();

    const { error } = await supabase.from("tasks").update(updates).eq("id", task_id);
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    return { content: [{ type: "text", text: `Task ${task_id} updated.` }] };
  }
);

// 5. Submit Result
server.tool(
  "submit_result",
  "Submit a final deliverable or result for a task.",
  {
    task_id: z.string().uuid(),
    summary: z.string(),
    content: z.string().optional(),
  },
  async ({ task_id, summary, content }) => {
    const supabase = createServiceClient();
    
    // Get task to find organization_id
    const { data: task } = await supabase.from("tasks").select("organization_id").eq("id", task_id).single();
    if (!task) return { content: [{ type: "text", text: "Task not found." }], isError: true };

    const { error } = await supabase.from("task_results").insert({
        task_id,
        organization_id: task.organization_id,
        summary,
        content,
        review_status: "submitted"
    });

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    return { content: [{ type: "text", text: `Result submitted for task ${task_id}.` }] };
  }
);

// 6. Get Decisions
server.tool(
  "get_decisions",
  "Retrieve historical decisions and strategic rationale.",
  {
    business_slug: z.string().optional(),
  },
  async ({ business_slug }) => {
    const { items: decisions } = await getDecisions();
    let filtered = decisions;
    if (business_slug) filtered = filtered.filter(d => d.business.toLowerCase().includes(business_slug.toLowerCase()));
    
    return {
      content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
    };
  }
);

// 7. Search Memory
server.tool(
  "search_memory",
  "Search the portfolio strategic memory for specific subjects or policies.",
  {
    query: z.string(),
  },
  async ({ query }) => {
    const supabase = createServiceClient();
    // Simple text search for now
    const { data, error } = await supabase
        .from("memory")
        .select("*")
        .or(`subject.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(10);

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// 8. Request Approval
server.tool(
  "request_approval",
  "Create an approval request for a YELLOW or RED action.",
  {
    title: z.string(),
    description: z.string(),
    amount: z.number().optional(),
    risk_level: z.enum(["low", "medium", "high", "critical"]).optional(),
    business_id: z.string().uuid().optional(),
  },
  async ({ title, description, amount, risk_level, business_id }) => {
    const supabase = createServiceClient();
    // Need organization_id. For pilot, we assume the first active org.
    const { data: org } = await supabase.from("organizations").select("id").limit(1).single();
    if (!org) return { content: [{ type: "text", text: "Organization not found." }], isError: true };

    const { data, error } = await supabase.from("approvals").insert({
        organization_id: org.id,
        business_id,
        title,
        description,
        requested_amount: amount,
        risk_level: risk_level || "medium",
        status: "pending"
    }).select().single();

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    return { content: [{ type: "text", text: `Approval request ${data.id} created.` }] };
  }
);

// 9. Report Agent Status
server.tool(
  "report_agent_status",
  "Report the current status and activity of an agent.",
  {
    agent_id: z.string().uuid(),
    status: z.string(),
    current_task: z.string().optional(),
  },
  async ({ agent_id, status, current_task }) => {
    const supabase = createServiceClient();
    const { error } = await supabase
        .from("agents")
        .update({ 
            status, 
            role: current_task || 'Idle',
            last_activity: new Date().toISOString()
        })
        .eq("id", agent_id);

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    return { content: [{ type: "text", text: `Agent ${agent_id} status reported as ${status}.` }] };
  }
);
