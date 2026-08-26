export enum ProjectStatus {
    PLANNING = "PLANNING",
    READY = "READY",
    EXECUTING = "EXECUTING",
    VERIFYING = "VERIFYING",
    RECOVERING = "RECOVERING",
    WAITING_ON_DEPENDENCY = "WAITING_ON_DEPENDENCY",
    WAITING_ON_APPROVAL = "WAITING_ON_APPROVAL",
    BLOCKED = "BLOCKED",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED"
}

export enum TaskStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    BLOCKED = "blocked"
}

export enum AuthorityLevel {
    GREEN = 1,
    YELLOW = 2,
    RED = 3
}

export enum VerificationLevel {
    BUILT = "BUILT",
    DEPLOYED = "DEPLOYED",
    LIVE_TESTED = "LIVE_TESTED",
    PRODUCTION_PASS = "PRODUCTION_PASS"
}

export enum AuditEventType {
    PROJECT_CREATED = "PROJECT_CREATED",
    PROJECT_STARTED = "PROJECT_STARTED",
    TASK_CREATED = "TASK_CREATED",
    TASK_ASSIGNED = "TASK_ASSIGNED",
    TASK_STARTED = "TASK_STARTED",
    TASK_COMPLETED = "TASK_COMPLETED",
    TASK_FAILED = "TASK_FAILED",
    RESULT_VERIFIED = "RESULT_VERIFIED",
    RESULT_REJECTED = "RESULT_REJECTED",
    RETRY_STARTED = "RETRY_STARTED",
    RECOVERY_STARTED = "RECOVERY_STARTED",
    PROJECT_BLOCKED = "PROJECT_BLOCKED",
    APPROVAL_REQUESTED = "APPROVAL_REQUESTED",
    APPROVAL_GRANTED = "APPROVAL_GRANTED",
    APPROVAL_DENIED = "APPROVAL_DENIED",
    EXECUTION_RESUMED = "EXECUTION_RESUMED",
    MILESTONE_COMPLETED = "MILESTONE_COMPLETED",
    PROJECT_COMPLETED = "PROJECT_COMPLETED"
}

export interface Task {
    id: string;
    project_id: string;
    milestone_id: string;
    title: string;
    description: string;
    status: TaskStatus;
    assigned_to?: string;
    authority_level: AuthorityLevel;
    dependencies: string[];
    evidence?: any;
    verification_level?: VerificationLevel;
    created_at: string;
    updated_at: string;
    retry_count: number;
    max_retries: number;
}

export interface Milestone {
    id: string;
    project_id: string;
    title: string;
    description: string;
    status: ProjectStatus;
    tasks: string[]; // task IDs
    created_at: string;
    updated_at: string;
}

export interface Project {
    id: string;
    business_id: string;
    name: string;
    description: string;
    status: ProjectStatus;
    milestones: string[]; // milestone IDs
    authority_level: AuthorityLevel;
    definition_of_done: string;
    created_at: string;
    updated_at: string;
    metadata: any;
}

export interface Decision {
    id: string;
    timestamp: string;
    project_id?: string;
    business_id?: string;
    subject: string;
    decision: string;
    rationale: string;
    alternatives?: string[];
    founder_approved: boolean;
    resulting_implementation?: string;
    outcome?: string;
}

export interface AuditEvent {
    id: string;
    timestamp: string;
    event_type: AuditEventType;
    project_id: string;
    task_id?: string;
    actor: string;
    previous_state?: string;
    new_state: string;
    evidence?: any;
    message: string;
}
