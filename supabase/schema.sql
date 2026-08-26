-- StewardHQ V1.2 — Multi-tenant commercial foundation
-- Fresh-install schema. Run this in a NEW dedicated Supabase project.
-- Existing V1.1 deployments should use migrations/003_multi_tenant.sql instead.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------- ENUMS ----------

do $$ begin
  create type public.business_status as enum ('active','build','paused','watch','archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.priority_level as enum ('low','medium','high','critical');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.task_status as enum ('backlog','ready','working','blocked','review','done','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.agent_platform as enum ('openai','anthropic','accio','human','other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.approval_status as enum ('pending','approved','rejected','expired','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.memory_category as enum ('strategy','policy','preference','sop','property','client','vendor','decision','pricing','goal','lesson','system');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.organization_role as enum ('owner','admin','member','viewer');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.membership_status as enum ('active','invited','suspended');
exception when duplicate_object then null; end $$;

-- ---------- IDENTITY / TENANCY ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'active' check (status in ('active','trial','past_due','suspended','archived')),
  plan_key text not null default 'internal',
  timezone text not null default 'America/New_York',
  currency_code text not null default 'USD',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'member',
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_id_idx
  on public.organization_members(user_id, status, organization_id);
create index if not exists organizations_owner_user_id_idx
  on public.organizations(owner_user_id);

-- ---------- CORE PORTFOLIO ----------

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null,
  name text not null,
  category text,
  status public.business_status not null default 'build',
  description text,
  primary_goal text,
  revenue_target numeric(14,2),
  current_revenue numeric(14,2),
  priority public.priority_level not null default 'medium',
  health_score int check (health_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug),
  unique (organization_id, id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid,
  name text not null,
  description text,
  status public.task_status not null default 'backlog',
  priority public.priority_level not null default 'medium',
  objective text,
  success_metric text,
  target_date date,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, business_id)
    references public.businesses(organization_id, id) on delete cascade
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  platform public.agent_platform not null,
  business_id uuid,
  role text not null,
  authority_level smallint not null default 0 check (authority_level between 0 and 5),
  model text,
  status text not null default 'ready',
  capabilities jsonb not null default '[]'::jsonb,
  external_agent_id text,
  last_activity timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, business_id)
    references public.businesses(organization_id, id) on delete set null (business_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid,
  project_id uuid,
  title text not null,
  description text,
  assigned_agent_id uuid,
  assigned_user_id uuid references auth.users(id) on delete set null,
  priority public.priority_level not null default 'medium',
  status public.task_status not null default 'backlog',
  due_at timestamptz,
  requires_approval boolean not null default false,
  output_summary text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, business_id)
    references public.businesses(organization_id, id) on delete cascade,
  foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete set null (project_id),
  foreign key (organization_id, assigned_agent_id)
    references public.agents(organization_id, id) on delete set null (assigned_agent_id)
);

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid,
  project_id uuid,
  question text not null,
  decision text not null,
  reason text,
  decision_maker text not null,
  supporting_analysis jsonb not null default '{}'::jsonb,
  alternatives_considered jsonb not null default '[]'::jsonb,
  effective_date date default current_date,
  review_date date,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, business_id)
    references public.businesses(organization_id, id) on delete cascade,
  foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete set null (project_id)
);

create table if not exists public.memory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid,
  category public.memory_category not null,
  subject text not null,
  content text not null,
  importance smallint not null default 3 check (importance between 1 and 5),
  source text,
  source_agent_id uuid,
  last_verified timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, business_id)
    references public.businesses(organization_id, id) on delete cascade,
  foreign key (organization_id, source_agent_id)
    references public.agents(organization_id, id) on delete set null (source_agent_id)
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid,
  task_id uuid,
  requested_by_agent_id uuid,
  action_type text not null,
  title text not null,
  description text,
  requested_amount numeric(14,2),
  risk_level public.priority_level not null default 'medium',
  recommendation text,
  status public.approval_status not null default 'pending',
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  notes text,
  unique (organization_id, id),
  foreign key (organization_id, business_id)
    references public.businesses(organization_id, id) on delete cascade,
  foreign key (organization_id, task_id)
    references public.tasks(organization_id, id) on delete set null (task_id),
  foreign key (organization_id, requested_by_agent_id)
    references public.agents(organization_id, id) on delete set null (requested_by_agent_id)
);

create table if not exists public.audit_log (
  id bigint generated by default as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_type text not null,
  actor_id text,
  action text not null,
  entity_type text,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  display_name text not null,
  status text not null default 'not_configured',
  endpoint_hint text,
  metadata jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider),
  unique (organization_id, id)
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid,
  agent_id uuid,
  provider text not null,
  external_run_id text,
  status text not null default 'queued',
  input_summary text,
  output_summary text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, task_id)
    references public.tasks(organization_id, id) on delete set null (task_id),
  foreign key (organization_id, agent_id)
    references public.agents(organization_id, id) on delete set null (agent_id)
);

-- ---------- INDEXES ----------

create index if not exists businesses_org_status_idx on public.businesses(organization_id, status);
create index if not exists projects_org_status_idx on public.projects(organization_id, status);
create index if not exists agents_org_status_idx on public.agents(organization_id, status);
create index if not exists tasks_org_status_idx on public.tasks(organization_id, status);
create index if not exists tasks_org_business_idx on public.tasks(organization_id, business_id);
create index if not exists approvals_org_status_idx on public.approvals(organization_id, status);
create index if not exists memory_org_category_idx on public.memory(organization_id, category);
create index if not exists decisions_org_created_idx on public.decisions(organization_id, created_at desc);
create index if not exists audit_log_org_created_idx on public.audit_log(organization_id, created_at desc);
create index if not exists agent_runs_org_created_idx on public.agent_runs(organization_id, created_at desc);

-- ---------- UPDATED_AT ----------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles','organizations','organization_members','businesses','projects','agents','tasks','memory','integrations'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end $$;

-- ---------- AUTH PROFILE BOOTSTRAP ----------

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- ---------- TENANT AUTHORIZATION HELPERS ----------
-- Kept in a non-exposed schema to avoid turning privileged helpers into public API endpoints.

create or replace function private.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org
      and om.user_id = (select auth.uid())
      and om.status = 'active'
  );
$$;

create or replace function private.has_org_role(target_org uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org
      and om.user_id = (select auth.uid())
      and om.status = 'active'
      and om.role::text = any(allowed_roles)
  );
$$;

revoke all on function private.is_org_member(uuid) from public;
revoke all on function private.has_org_role(uuid, text[]) from public;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, text[]) to authenticated;

-- Keep a workspace from losing its final active owner. Ownership transfer will be a dedicated workflow later.
create or replace function private.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining_owners integer;
begin
  if old.role = 'owner' and old.status = 'active' and (
    tg_op = 'DELETE'
    or new.role <> 'owner'
    or new.status <> 'active'
  ) then
    select count(*) into remaining_owners
    from public.organization_members om
    where om.organization_id = old.organization_id
      and om.user_id <> old.user_id
      and om.role = 'owner'
      and om.status = 'active';

    if remaining_owners = 0 then
      raise exception 'A StewardHQ workspace must retain at least one active owner.';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.protect_last_owner() from public;

drop trigger if exists protect_last_owner_membership on public.organization_members;
create trigger protect_last_owner_membership
before update or delete on public.organization_members
for each row execute function private.protect_last_owner();

create or replace function private.protect_organization_owner_reference()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_user_id <> old.owner_user_id then
    raise exception 'Use the StewardHQ ownership-transfer workflow to change the organization owner.';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_organization_owner_reference() from public;

drop trigger if exists protect_organization_owner_reference on public.organizations;
create trigger protect_organization_owner_reference
before update on public.organizations
for each row execute function private.protect_organization_owner_reference();

-- ---------- RLS ----------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.businesses enable row level security;
alter table public.projects enable row level security;
alter table public.agents enable row level security;
alter table public.tasks enable row level security;
alter table public.decisions enable row level security;
alter table public.memory enable row level security;
alter table public.approvals enable row level security;
alter table public.audit_log enable row level security;
alter table public.integrations enable row level security;
alter table public.agent_runs enable row level security;

-- Profiles: a user controls only their profile. Organization roles are stored separately.
create policy "profile_select_self" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "profile_update_self" on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Organizations: users can create a workspace they own, then bootstrap their owner membership.
create policy "organizations_select_member" on public.organizations for select to authenticated
  using (private.is_org_member(id) or owner_user_id = (select auth.uid()));
create policy "organizations_insert_owner" on public.organizations for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "organizations_update_admin" on public.organizations for update to authenticated
  using (private.has_org_role(id, array['owner','admin']))
  with check (private.has_org_role(id, array['owner','admin']));
create policy "organizations_delete_owner" on public.organizations for delete to authenticated
  using (private.has_org_role(id, array['owner']));

-- Memberships: active members can see the roster. Owners manage all roles; admins manage non-owner roles.
create policy "members_select_org" on public.organization_members for select to authenticated
  using (private.is_org_member(organization_id));
create policy "members_insert_bootstrap_or_admin" on public.organization_members for insert to authenticated
  with check (
    (
      user_id = (select auth.uid())
      and role = 'owner'
      and status = 'active'
      and exists (
        select 1 from public.organizations o
        where o.id = organization_id
          and o.owner_user_id = (select auth.uid())
      )
    )
    or private.has_org_role(organization_id, array['owner'])
    or (private.has_org_role(organization_id, array['admin']) and role <> 'owner')
  );
create policy "members_update_admin" on public.organization_members for update to authenticated
  using (
    private.has_org_role(organization_id, array['owner'])
    or (private.has_org_role(organization_id, array['admin']) and role <> 'owner')
  )
  with check (
    private.has_org_role(organization_id, array['owner'])
    or (private.has_org_role(organization_id, array['admin']) and role <> 'owner')
  );
create policy "members_delete_admin" on public.organization_members for delete to authenticated
  using (
    private.has_org_role(organization_id, array['owner'])
    or (private.has_org_role(organization_id, array['admin']) and role <> 'owner')
  );

-- Core read access for any active member.
create policy "businesses_select_member" on public.businesses for select to authenticated using (private.is_org_member(organization_id));
create policy "projects_select_member" on public.projects for select to authenticated using (private.is_org_member(organization_id));
create policy "agents_select_member" on public.agents for select to authenticated using (private.is_org_member(organization_id));
create policy "tasks_select_member" on public.tasks for select to authenticated using (private.is_org_member(organization_id));
create policy "decisions_select_member" on public.decisions for select to authenticated using (private.is_org_member(organization_id));
create policy "memory_select_member" on public.memory for select to authenticated using (private.is_org_member(organization_id));
create policy "approvals_select_member" on public.approvals for select to authenticated using (private.is_org_member(organization_id));
create policy "agent_runs_select_member" on public.agent_runs for select to authenticated using (private.is_org_member(organization_id));

-- Owner/admin controlled resources.
create policy "businesses_write_admin" on public.businesses for all to authenticated
  using (private.has_org_role(organization_id, array['owner','admin']))
  with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "projects_write_admin" on public.projects for all to authenticated
  using (private.has_org_role(organization_id, array['owner','admin']))
  with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "agents_write_admin" on public.agents for all to authenticated
  using (private.has_org_role(organization_id, array['owner','admin']))
  with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "decisions_write_admin" on public.decisions for all to authenticated
  using (private.has_org_role(organization_id, array['owner','admin']))
  with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "memory_write_admin" on public.memory for all to authenticated
  using (private.has_org_role(organization_id, array['owner','admin']))
  with check (private.has_org_role(organization_id, array['owner','admin']));

-- Tasks can be worked by owners/admins/members, but viewers are read-only.
create policy "tasks_write_operator" on public.tasks for all to authenticated
  using (private.has_org_role(organization_id, array['owner','admin','member']))
  with check (private.has_org_role(organization_id, array['owner','admin','member']));

-- Any operator can request an approval; only owner/admin may decide or delete it.
create policy "approvals_insert_operator" on public.approvals for insert to authenticated
  with check (private.has_org_role(organization_id, array['owner','admin','member']));
create policy "approvals_update_admin" on public.approvals for update to authenticated
  using (private.has_org_role(organization_id, array['owner','admin']))
  with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "approvals_delete_admin" on public.approvals for delete to authenticated
  using (private.has_org_role(organization_id, array['owner','admin']));

-- Audit log: members may append events; only owner/admin can inspect the full ledger.
create policy "audit_insert_member" on public.audit_log for insert to authenticated
  with check (private.is_org_member(organization_id));
create policy "audit_select_admin" on public.audit_log for select to authenticated
  using (private.has_org_role(organization_id, array['owner','admin']));

-- Integration config is restricted to owner/admin; agent runs are operational data.
create policy "integrations_admin" on public.integrations for all to authenticated
  using (private.has_org_role(organization_id, array['owner','admin']))
  with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "agent_runs_insert_operator" on public.agent_runs for insert to authenticated
  with check (private.has_org_role(organization_id, array['owner','admin','member']));
create policy "agent_runs_update_operator" on public.agent_runs for update to authenticated
  using (private.has_org_role(organization_id, array['owner','admin','member']))
  with check (private.has_org_role(organization_id, array['owner','admin','member']));

-- ---------- DATA API PRIVILEGES ----------
-- No anon table access. Authenticated users receive DML privileges, with RLS as the authorization layer.

revoke all on table public.profiles, public.organizations, public.organization_members,
  public.businesses, public.projects, public.agents, public.tasks, public.decisions,
  public.memory, public.approvals, public.audit_log, public.integrations, public.agent_runs
from anon;

grant select, insert, update, delete on table public.profiles, public.organizations, public.organization_members,
  public.businesses, public.projects, public.agents, public.tasks, public.decisions,
  public.memory, public.approvals, public.audit_log, public.integrations, public.agent_runs
to authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- Deliberately no hard-coded customer or portfolio seed data in the commercial schema.
-- The first authenticated user creates an organization through /onboarding.
