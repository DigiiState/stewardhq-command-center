-- StewardHQ V1.2 upgrade path for an EXISTING V1.1 database.
-- Fresh projects should use ../schema.sql instead.
-- IMPORTANT: run only after the V1.1 owner Auth account exists.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

do $$ begin
  create type public.organization_role as enum ('owner','admin','member','viewer');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.membership_status as enum ('active','invited','suspended');
exception when duplicate_object then null; end $$;

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

create index if not exists organization_members_user_id_idx on public.organization_members(user_id, status, organization_id);

-- Backfill one legacy workspace from the V1.1 owner profile.
do $$
declare
  legacy_owner uuid;
  legacy_org uuid;
begin
  select id into legacy_owner from public.profiles where role = 'owner' order by created_at limit 1;
  if legacy_owner is null then
    raise exception 'V1.1 owner profile not found. Create/sign in the owner Auth user before running 003_multi_tenant.sql.';
  end if;

  select id into legacy_org from public.organizations where slug = 'legacy-portfolio' limit 1;
  if legacy_org is null then
    insert into public.organizations (name, slug, owner_user_id, plan_key)
    values ('Legacy Portfolio', 'legacy-portfolio', legacy_owner, 'internal')
    returning id into legacy_org;
  end if;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (legacy_org, legacy_owner, 'owner', 'active')
  on conflict (organization_id, user_id) do update set role = 'owner', status = 'active';

  alter table public.businesses add column if not exists organization_id uuid;
  alter table public.projects add column if not exists organization_id uuid;
  alter table public.agents add column if not exists organization_id uuid;
  alter table public.tasks add column if not exists organization_id uuid;
  alter table public.decisions add column if not exists organization_id uuid;
  alter table public.memory add column if not exists organization_id uuid;
  alter table public.approvals add column if not exists organization_id uuid;
  alter table public.audit_log add column if not exists organization_id uuid;
  alter table public.integrations add column if not exists organization_id uuid;
  alter table public.agent_runs add column if not exists organization_id uuid;

  update public.businesses set organization_id = legacy_org where organization_id is null;
  update public.projects set organization_id = legacy_org where organization_id is null;
  update public.agents set organization_id = legacy_org where organization_id is null;
  update public.tasks set organization_id = legacy_org where organization_id is null;
  update public.decisions set organization_id = legacy_org where organization_id is null;
  update public.memory set organization_id = legacy_org where organization_id is null;
  update public.approvals set organization_id = legacy_org where organization_id is null;
  update public.audit_log set organization_id = legacy_org where organization_id is null;
  update public.integrations set organization_id = legacy_org where organization_id is null;
  update public.agent_runs set organization_id = legacy_org where organization_id is null;
end $$;

alter table public.businesses alter column organization_id set not null;
alter table public.projects alter column organization_id set not null;
alter table public.agents alter column organization_id set not null;
alter table public.tasks alter column organization_id set not null;
alter table public.decisions alter column organization_id set not null;
alter table public.memory alter column organization_id set not null;
alter table public.approvals alter column organization_id set not null;
alter table public.audit_log alter column organization_id set not null;
alter table public.integrations alter column organization_id set not null;
alter table public.agent_runs alter column organization_id set not null;

alter table public.businesses add constraint businesses_organization_fk foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.projects add constraint projects_organization_fk foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.agents add constraint agents_organization_fk foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.tasks add constraint tasks_organization_fk foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.decisions add constraint decisions_organization_fk foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.memory add constraint memory_organization_fk foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.approvals add constraint approvals_organization_fk foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.audit_log add constraint audit_log_organization_fk foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.integrations add constraint integrations_organization_fk foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.agent_runs add constraint agent_runs_organization_fk foreign key (organization_id) references public.organizations(id) on delete cascade;

-- Existing global uniqueness becomes tenant-scoped.
alter table public.businesses drop constraint if exists businesses_slug_key;
create unique index if not exists businesses_org_slug_key on public.businesses(organization_id, slug);
alter table public.integrations drop constraint if exists integrations_provider_key;
create unique index if not exists integrations_org_provider_key on public.integrations(organization_id, provider);

create or replace function private.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = target_org
      and om.user_id = (select auth.uid())
      and om.status = 'active'
  );
$$;
create or replace function private.has_org_role(target_org uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members om
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

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

-- Remove global owner policies from V1/V1.1.
drop policy if exists "owner_businesses" on public.businesses;
drop policy if exists "owner_projects" on public.projects;
drop policy if exists "owner_agents" on public.agents;
drop policy if exists "owner_tasks" on public.tasks;
drop policy if exists "owner_decisions" on public.decisions;
drop policy if exists "owner_memory" on public.memory;
drop policy if exists "owner_approvals" on public.approvals;
drop policy if exists "owner_audit" on public.audit_log;
drop policy if exists "owner_audit_insert" on public.audit_log;
drop policy if exists "owner_integrations" on public.integrations;
drop policy if exists "owner_agent_runs" on public.agent_runs;

create policy "organizations_select_member" on public.organizations for select to authenticated
  using (private.is_org_member(id) or owner_user_id = (select auth.uid()));
create policy "organizations_insert_owner" on public.organizations for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy "organizations_update_admin" on public.organizations for update to authenticated
  using (private.has_org_role(id, array['owner','admin']))
  with check (private.has_org_role(id, array['owner','admin']));
create policy "organizations_delete_owner" on public.organizations for delete to authenticated
  using (private.has_org_role(id, array['owner']));

create policy "members_select_org" on public.organization_members for select to authenticated using (private.is_org_member(organization_id));
create policy "members_insert_bootstrap_or_admin" on public.organization_members for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and role = 'owner' and status = 'active' and exists (
      select 1 from public.organizations o where o.id = organization_id and o.owner_user_id = (select auth.uid())
    ))
    or private.has_org_role(organization_id, array['owner'])
    or (private.has_org_role(organization_id, array['admin']) and role <> 'owner')
  );
create policy "members_update_admin" on public.organization_members for update to authenticated
  using (private.has_org_role(organization_id, array['owner']) or (private.has_org_role(organization_id, array['admin']) and role <> 'owner'))
  with check (private.has_org_role(organization_id, array['owner']) or (private.has_org_role(organization_id, array['admin']) and role <> 'owner'));
create policy "members_delete_admin" on public.organization_members for delete to authenticated
  using (private.has_org_role(organization_id, array['owner']) or (private.has_org_role(organization_id, array['admin']) and role <> 'owner'));

create policy "businesses_select_member" on public.businesses for select to authenticated using (private.is_org_member(organization_id));
create policy "businesses_write_admin" on public.businesses for all to authenticated using (private.has_org_role(organization_id, array['owner','admin'])) with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "projects_select_member" on public.projects for select to authenticated using (private.is_org_member(organization_id));
create policy "projects_write_admin" on public.projects for all to authenticated using (private.has_org_role(organization_id, array['owner','admin'])) with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "agents_select_member" on public.agents for select to authenticated using (private.is_org_member(organization_id));
create policy "agents_write_admin" on public.agents for all to authenticated using (private.has_org_role(organization_id, array['owner','admin'])) with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "tasks_select_member" on public.tasks for select to authenticated using (private.is_org_member(organization_id));
create policy "tasks_write_operator" on public.tasks for all to authenticated using (private.has_org_role(organization_id, array['owner','admin','member'])) with check (private.has_org_role(organization_id, array['owner','admin','member']));
create policy "decisions_select_member" on public.decisions for select to authenticated using (private.is_org_member(organization_id));
create policy "decisions_write_admin" on public.decisions for all to authenticated using (private.has_org_role(organization_id, array['owner','admin'])) with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "memory_select_member" on public.memory for select to authenticated using (private.is_org_member(organization_id));
create policy "memory_write_admin" on public.memory for all to authenticated using (private.has_org_role(organization_id, array['owner','admin'])) with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "approvals_select_member" on public.approvals for select to authenticated using (private.is_org_member(organization_id));
create policy "approvals_insert_operator" on public.approvals for insert to authenticated with check (private.has_org_role(organization_id, array['owner','admin','member']));
create policy "approvals_update_admin" on public.approvals for update to authenticated using (private.has_org_role(organization_id, array['owner','admin'])) with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "approvals_delete_admin" on public.approvals for delete to authenticated using (private.has_org_role(organization_id, array['owner','admin']));
create policy "audit_insert_member" on public.audit_log for insert to authenticated with check (private.is_org_member(organization_id));
create policy "audit_select_admin" on public.audit_log for select to authenticated using (private.has_org_role(organization_id, array['owner','admin']));
create policy "integrations_admin" on public.integrations for all to authenticated using (private.has_org_role(organization_id, array['owner','admin'])) with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "agent_runs_select_member" on public.agent_runs for select to authenticated using (private.is_org_member(organization_id));
create policy "agent_runs_insert_operator" on public.agent_runs for insert to authenticated with check (private.has_org_role(organization_id, array['owner','admin','member']));
create policy "agent_runs_update_operator" on public.agent_runs for update to authenticated using (private.has_org_role(organization_id, array['owner','admin','member'])) with check (private.has_org_role(organization_id, array['owner','admin','member']));

create index if not exists businesses_org_status_idx on public.businesses(organization_id, status);
create index if not exists projects_org_status_idx on public.projects(organization_id, status);
create index if not exists agents_org_status_idx on public.agents(organization_id, status);
create index if not exists tasks_org_status_idx on public.tasks(organization_id, status);
create index if not exists approvals_org_status_idx on public.approvals(organization_id, status);
create index if not exists memory_org_category_idx on public.memory(organization_id, category);
create index if not exists audit_log_org_created_idx on public.audit_log(organization_id, created_at desc);
create index if not exists agent_runs_org_created_idx on public.agent_runs(organization_id, created_at desc);
