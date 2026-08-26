# StewardHQ Supabase — V1.2 multi-tenant setup

## Fresh project

1. Create a **dedicated Supabase project** for StewardHQ.
2. Run `schema.sql` once in the SQL editor.
3. Create/sign in the first Auth user.
4. Open StewardHQ; `/onboarding` creates that user's first organization and owner membership.
5. Copy the Project URL and **Publishable key** into `.env.local`.
6. Never expose a secret/service-role key in browser code.
7. Run Supabase Security Advisor after applying the schema and fix any findings before production.

`schema.sql` is consolidated. **Do not run migrations 002/003 on a fresh project.**

## Existing V1.1 project

If StewardHQ V1.1 was already deployed:

1. Confirm the V1.1 owner Auth user/profile exists.
2. Apply `migrations/003_multi_tenant.sql`.
3. Verify the legacy data was backfilled into the generated `Legacy Portfolio` organization.
4. Run Security Advisor.

## Tenant model

Every operating record is scoped by `organization_id`:

- businesses
- projects
- agents
- tasks
- decisions
- memory
- approvals
- audit_log
- integrations
- agent_runs

Users gain access through `organization_members` with one of four roles:

- `owner`
- `admin`
- `member`
- `viewer`

Row Level Security checks active organization membership on every exposed operating table. The app also sends an explicit `organization_id` filter on normal queries for performance and defense in depth.

## Security notes

- No `anon` table access is granted.
- Authorization roles are not stored in editable user metadata.
- Tenant authorization helpers live in the non-exposed `private` schema.
- Cross-tenant relationships are constrained in the fresh schema with composite organization-aware foreign keys.
- Owners/admins control business configuration and approvals.
- Members can work tasks and request approvals.
- Viewers are read-only.
- Full audit history is visible only to owner/admin roles.
