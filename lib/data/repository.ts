import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getWorkspaceContext, type WorkspaceContext } from "@/lib/tenancy/context";
import {
  agents as demoAgents,
  approvals as demoApprovals,
  businesses as demoBusinesses,
  priorities as demoPriorities,
} from "@/lib/data/demo";

export type DataMode = "live" | "preview";

export type UIBusiness = {
  id?: string;
  slug: string;
  name: string;
  shortName: string;
  status: string;
  health: number | null;
  priority: string;
  description: string;
  revenue: string;
  metricLabel: string;
  metricValue: string;
  alerts: number;
};

export type UIAgent = {
  id?: string;
  name: string;
  business: string;
  platform: string;
  status: string;
  task: string;
  authority: number;
};

export type UIApproval = {
  id: string;
  business: string;
  title: string;
  amount: string;
  risk: string;
  recommendation: string;
  reason: string;
  status: string;
};

export type UITask = {
  id: string | number;
  business: string;
  title: string;
  detail: string;
  severity: string;
  status: string;
};

export type UIReview = {
  id: string;
  taskId: string;
  title: string;
  business: string;
  provider: string;
  summary: string;
  content: string | null;
  reviewStatus: string;
  taskStatus: string;
  createdAt: string;
};

export type UIActivity = {
  id: string | number;
  action: string;
  actor: string;
  entity: string;
  label: string;
  createdAt: string;
};

function money(value: number | string | null | undefined, currency = "USD") {
  if (value === null || value === undefined || value === "") return "$—";
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return "$—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(parsed);
}

function relationName(value: unknown, fallback = "Portfolio") {
  if (!value) return fallback;
  if (Array.isArray(value)) {
    const first = value[0] as { name?: string } | undefined;
    return first?.name ?? fallback;
  }
  if (typeof value === "object" && value !== null && "name" in value) {
    return String((value as { name?: string }).name ?? fallback);
  }
  return fallback;
}

async function liveScope() {
  const workspace = await getWorkspaceContext();
  if (workspace.mode === "preview") return { workspace, organizationId: null, currency: "USD" };
  return {
    workspace,
    organizationId: workspace.active?.organizationId ?? null,
    currency: workspace.active?.currencyCode ?? "USD",
  };
}

async function getBusinessesFor(workspace: WorkspaceContext, organizationId: string, currency: string) {
  const supabase = await createClient();
  const [{ data: rows, error }, { data: openTasks }, { data: pendingApprovals }] = await Promise.all([
    supabase.from("businesses").select("*").eq("organization_id", organizationId).order("name"),
    supabase
      .from("tasks")
      .select("business_id,status")
      .eq("organization_id", organizationId)
      .not("status", "in", "(done,cancelled)"),
    supabase
      .from("approvals")
      .select("business_id,status")
      .eq("organization_id", organizationId)
      .eq("status", "pending"),
  ]);

  if (error) throw new Error(`Unable to load businesses: ${error.message}`);

  const taskCounts = new Map<string, number>();
  for (const task of openTasks ?? []) {
    if (!task.business_id) continue;
    taskCounts.set(task.business_id, (taskCounts.get(task.business_id) ?? 0) + 1);
  }

  const approvalCounts = new Map<string, number>();
  for (const approval of pendingApprovals ?? []) {
    if (!approval.business_id) continue;
    approvalCounts.set(approval.business_id, (approvalCounts.get(approval.business_id) ?? 0) + 1);
  }

  const items: UIBusiness[] = (rows ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.name,
    status: String(row.status ?? "build").toUpperCase(),
    health: row.health_score ?? null,
    priority: String(row.priority ?? "medium").toUpperCase(),
    description: row.description ?? "",
    revenue: money(row.current_revenue, currency),
    metricLabel: "Open Tasks",
    metricValue: String(taskCounts.get(row.id) ?? 0),
    alerts: approvalCounts.get(row.id) ?? 0,
  }));

  return { mode: "live" as const, items, workspace };
}

export async function getBusinesses(): Promise<{ mode: DataMode; items: UIBusiness[] }> {
  if (!isSupabaseConfigured()) return { mode: "preview", items: demoBusinesses };
  const { workspace, organizationId, currency } = await liveScope();
  if (!organizationId) return { mode: "live", items: [] };
  const result = await getBusinessesFor(workspace, organizationId, currency);
  return { mode: result.mode, items: result.items };
}

export async function getBusinessBySlug(slug: string) {
  if (!isSupabaseConfigured()) {
    const item = demoBusinesses.find((business) => business.slug === slug) ?? null;
    return { mode: "preview" as const, item };
  }

  const { organizationId, currency } = await liveScope();
  if (!organizationId) return { mode: "live" as const, item: null };

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Unable to load business: ${error.message}`);
  if (!row) return { mode: "live" as const, item: null };

  const [{ count: taskCount }, { count: approvalCount }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("business_id", row.id)
      .not("status", "in", "(done,cancelled)"),
    supabase
      .from("approvals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("business_id", row.id)
      .eq("status", "pending"),
  ]);

  const item: UIBusiness = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.name,
    status: String(row.status ?? "build").toUpperCase(),
    health: row.health_score ?? null,
    priority: String(row.priority ?? "medium").toUpperCase(),
    description: row.description ?? "",
    revenue: money(row.current_revenue, currency),
    metricLabel: "Open Tasks",
    metricValue: String(taskCount ?? 0),
    alerts: approvalCount ?? 0,
  };

  return { mode: "live" as const, item };
}

export async function getAgents(): Promise<{ mode: DataMode; items: UIAgent[] }> {
  if (!isSupabaseConfigured()) return { mode: "preview", items: demoAgents };
  const { organizationId } = await liveScope();
  if (!organizationId) return { mode: "live", items: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("id,name,platform,role,authority_level,status,last_activity,businesses(name)")
    .eq("organization_id", organizationId)
    .order("name");

  if (error) throw new Error(`Unable to load agents: ${error.message}`);

  const items: UIAgent[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    business: relationName(row.businesses),
    platform: String(row.platform ?? "other").toUpperCase(),
    status: String(row.status ?? "ready"),
    task: row.role ?? "",
    authority: row.authority_level ?? 0,
  }));

  return { mode: "live", items };
}

export async function getTasks(): Promise<{ mode: DataMode; items: UITask[] }> {
  if (!isSupabaseConfigured()) {
    return { mode: "preview", items: demoPriorities.map((item) => ({ ...item, status: "OPEN" })) };
  }
  const { organizationId } = await liveScope();
  if (!organizationId) return { mode: "live", items: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id,title,description,priority,status,due_at,businesses(name)")
    .eq("organization_id", organizationId)
    .not("status", "in", "(done,cancelled)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Unable to load tasks: ${error.message}`);

  const items: UITask[] = (data ?? []).map((row) => ({
    id: row.id,
    business: relationName(row.businesses),
    title: row.title,
    detail: row.description ?? "No additional detail recorded.",
    severity: String(row.priority ?? "medium"),
    status: String(row.status ?? "backlog").toUpperCase(),
  }));

  return { mode: "live", items };
}

export async function getApprovals(): Promise<{ mode: DataMode; items: UIApproval[] }> {
  if (!isSupabaseConfigured()) {
    return { mode: "preview", items: demoApprovals.map((item) => ({ ...item, status: "PENDING" })) };
  }
  const { organizationId, currency } = await liveScope();
  if (!organizationId) return { mode: "live", items: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approvals")
    .select("id,title,description,requested_amount,risk_level,recommendation,status,businesses(name)")
    .eq("organization_id", organizationId)
    .order("requested_at", { ascending: false });

  if (error) throw new Error(`Unable to load approvals: ${error.message}`);

  const items: UIApproval[] = (data ?? []).map((row) => ({
    id: row.id,
    business: relationName(row.businesses),
    title: row.title,
    amount: money(row.requested_amount, currency),
    risk: String(row.risk_level ?? "medium").toUpperCase(),
    recommendation: row.recommendation ?? "REVIEW",
    reason: row.description ?? "No supporting detail recorded.",
    status: String(row.status ?? "pending").toUpperCase(),
  }));

  return { mode: "live", items };
}

export async function getReviews(): Promise<{ mode: DataMode; items: UIReview[] }> {
  if (!isSupabaseConfigured()) return { mode: "preview", items: [] };
  const { organizationId } = await liveScope();
  if (!organizationId) return { mode: "live", items: [] };

  const supabase = await createClient();
  const { data: results, error } = await supabase
    .from("task_results")
    .select("id,task_id,provider,summary,content,review_status,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Unable to load task results: ${error.message}`);

  const taskIds = Array.from(new Set((results ?? []).map((row) => row.task_id)));
  const { data: taskRows, error: taskError } = taskIds.length
    ? await supabase
        .from("tasks")
        .select("id,title,status,business_id,businesses(name)")
        .eq("organization_id", organizationId)
        .in("id", taskIds)
    : { data: [], error: null };
  if (taskError) throw new Error(`Unable to load review tasks: ${taskError.message}`);

  const taskMap = new Map((taskRows ?? []).map((row) => [row.id, row]));
  const items: UIReview[] = (results ?? []).map((row) => {
    const task = taskMap.get(row.task_id);
    return {
      id: row.id,
      taskId: row.task_id,
      title: task?.title ?? "Agent deliverable",
      business: relationName(task?.businesses),
      provider: String(row.provider ?? "agent").toUpperCase(),
      summary: row.summary,
      content: row.content ?? null,
      reviewStatus: String(row.review_status ?? "submitted"),
      taskStatus: String(task?.status ?? "review"),
      createdAt: row.created_at,
    };
  });

  return { mode: "live", items };
}

export async function getRecentActivity(): Promise<{ mode: DataMode; items: UIActivity[] }> {
  if (!isSupabaseConfigured()) return { mode: "preview", items: [] };
  const { organizationId } = await liveScope();
  if (!organizationId) return { mode: "live", items: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id,actor_type,actor_id,action,entity_type,entity_id,payload,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) throw new Error(`Unable to load activity: ${error.message}`);

  const items: UIActivity[] = (data ?? []).map((row) => {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const label = String(payload.title ?? payload.summary ?? payload.status ?? row.entity_id ?? row.action);
    return {
      id: row.id,
      action: String(row.action),
      actor: row.actor_type === "human" ? "Owner" : String(row.actor_id ?? row.actor_type ?? "System"),
      entity: String(row.entity_type ?? "system"),
      label,
      createdAt: row.created_at,
    };
  });
  return { mode: "live", items };
}

export async function getDecisions() {
  if (!isSupabaseConfigured()) return { mode: "preview" as const, items: [] };
  const { organizationId } = await liveScope();
  if (!organizationId) return { mode: "live" as const, items: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decisions")
    .select("id,question,decision,reason,decision_maker,effective_date,businesses(name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Unable to load decisions: ${error.message}`);

  const items = (data ?? []).map((row) => ({
    id: row.id,
    business: relationName(row.businesses),
    question: row.question,
    decision: row.decision,
    reason: row.reason ?? "",
    decisionMaker: row.decision_maker,
    effectiveDate: row.effective_date,
  }));

  return { mode: "live", items };
}

export async function getDashboardSnapshot() {
  if (!isSupabaseConfigured()) {
    return {
      mode: "preview" as const,
      workspace: await getWorkspaceContext(),
      businesses: demoBusinesses,
      agents: demoAgents,
      approvals: demoApprovals.map((item) => ({ ...item, status: "PENDING" })),
      tasks: demoPriorities.map((item) => ({ ...item, status: "OPEN" })),
      reviews: [],
      activity: [],
    };
  }

  const { workspace, organizationId, currency } = await liveScope();
  if (!organizationId) {
    return { mode: "live" as const, workspace, businesses: [], agents: [], approvals: [], tasks: [], reviews: [], activity: [] };
  }

  const supabase = await createClient();
  const [businessResult, agentResult, approvalResult, taskResult, reviewResult, activityResult] = await Promise.all([
    getBusinessesFor(workspace, organizationId, currency),
    supabase
      .from("agents")
      .select("id,name,platform,role,authority_level,status,last_activity,businesses(name)")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase
      .from("approvals")
      .select("id,title,description,requested_amount,risk_level,recommendation,status,businesses(name)")
      .eq("organization_id", organizationId)
      .order("requested_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id,title,description,priority,status,due_at,businesses(name)")
      .eq("organization_id", organizationId)
      .not("status", "in", "(done,cancelled)")
      .order("created_at", { ascending: false }),
    getReviews(),
    getRecentActivity(),
  ]);

  if (agentResult.error) throw new Error(`Unable to load agents: ${agentResult.error.message}`);
  if (approvalResult.error) throw new Error(`Unable to load approvals: ${approvalResult.error.message}`);
  if (taskResult.error) throw new Error(`Unable to load tasks: ${taskResult.error.message}`);

  const agents: UIAgent[] = (agentResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    business: relationName(row.businesses),
    platform: String(row.platform ?? "other").toUpperCase(),
    status: String(row.status ?? "ready"),
    task: row.role ?? "",
    authority: row.authority_level ?? 0,
  }));

  const approvals: UIApproval[] = (approvalResult.data ?? []).map((row) => ({
    id: row.id,
    business: relationName(row.businesses),
    title: row.title,
    amount: money(row.requested_amount, currency),
    risk: String(row.risk_level ?? "medium").toUpperCase(),
    recommendation: row.recommendation ?? "REVIEW",
    reason: row.description ?? "No supporting detail recorded.",
    status: String(row.status ?? "pending").toUpperCase(),
  }));

  const tasks: UITask[] = (taskResult.data ?? []).map((row) => ({
    id: row.id,
    business: relationName(row.businesses),
    title: row.title,
    detail: row.description ?? "No additional detail recorded.",
    severity: String(row.priority ?? "medium"),
    status: String(row.status ?? "backlog").toUpperCase(),
  }));

  return {
    mode: "live" as const,
    workspace,
    businesses: businessResult.items,
    agents,
    approvals,
    tasks,
    reviews: reviewResult.items,
    activity: activityResult.items,
  };
}

export async function getExecutiveContext() {
  const snapshot = await getDashboardSnapshot();

  if (!isSupabaseConfigured() || !snapshot.workspace.active) {
    return {
      mode: snapshot.mode,
      workspace: snapshot.workspace.active,
      businesses: snapshot.businesses.map((business) => ({
        name: business.name,
        status: business.status,
        priority: business.priority,
        health: business.health,
        openTasks: business.metricValue,
        pendingApprovals: business.alerts,
      })),
      tasks: snapshot.tasks.slice(0, 10),
      approvals: snapshot.approvals.filter((item) => item.status === "PENDING").slice(0, 10),
      agents: snapshot.agents.slice(0, 15),
      memory: [],
      decisions: [],
    };
  }

  const organizationId = snapshot.workspace.active.organizationId;
  const supabase = await createClient();
  const [{ data: memory }, { data: decisions }] = await Promise.all([
    supabase
      .from("memory")
      .select("category,subject,content,importance,last_verified,businesses(name)")
      .eq("organization_id", organizationId)
      .order("importance", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("decisions")
      .select("question,decision,reason,decision_maker,effective_date,businesses(name)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  return {
    mode: snapshot.mode,
    workspace: {
      id: snapshot.workspace.active.organizationId,
      name: snapshot.workspace.active.organizationName,
      role: snapshot.workspace.active.role,
      timezone: snapshot.workspace.active.timezone,
      currency: snapshot.workspace.active.currencyCode,
    },
    businesses: snapshot.businesses.map((business) => ({
      name: business.name,
      status: business.status,
      priority: business.priority,
      health: business.health,
      openTasks: business.metricValue,
      pendingApprovals: business.alerts,
    })),
    tasks: snapshot.tasks.slice(0, 15),
    approvals: snapshot.approvals.filter((item) => item.status === "PENDING").slice(0, 10),
    agents: snapshot.agents.slice(0, 20),
    memory: (memory ?? []).map((item) => ({
      business: relationName(item.businesses),
      category: item.category,
      subject: item.subject,
      content: item.content,
      importance: item.importance,
      lastVerified: item.last_verified,
    })),
    decisions: (decisions ?? []).map((item) => ({
      business: relationName(item.businesses),
      question: item.question,
      decision: item.decision,
      reason: item.reason,
      decisionMaker: item.decision_maker,
      effectiveDate: item.effective_date,
    })),
  };
}
