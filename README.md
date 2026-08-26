# StewardHQ — V1.2 Multi-Tenant Foundation

**StewardHQ** is an executive operating system for multi-business owners who need one command center for businesses, projects, approvals, institutional memory, human teams and AI workers.

V1.2 changes the product from a single-owner prototype into a commercial-ready multi-tenant architecture while preserving the desktop/mobile executive dashboard.

## V1.2 status

### Built

- Responsive desktop + mobile/PWA dashboard
- Supabase SSR authentication foundation
- Organizations/workspaces
- Organization membership roles: Owner / Admin / Member / Viewer
- Active-workspace selection via secure server cookie
- First-workspace onboarding flow
- Workspace switcher for users belonging to multiple organizations
- Tenant-scoped businesses, projects, agents, tasks, approvals, decisions, memory, integrations, AI runs and audit events
- Organization-aware foreign-key boundaries in the fresh database schema
- Row Level Security for tenant isolation
- Explicit organization filters in application queries
- Live/preview data modes
- Persistent approval decisions + audit history
- Shared Executive Context scoped to the active workspace
- OpenAI strategy adapter contract
- Claude technical/QA adapter contract
- Accio private bridge contract
- AI run ledger and health endpoint
- No hard-coded commercial customer portfolio data in the production schema

### Still to connect

- Dedicated live StewardHQ Supabase project
- First live workspace + your private portfolio seed
- OpenAI API credential + chosen production model
- Anthropic API credential + chosen Claude model
- Accio Work bridge/MCP implementation
- Push notifications
- Executive Morning Brief automation
- Billing/subscription provider
- Member invitations UI
- Production Vercel/domain deployment and certification

## Fresh Supabase install

For a brand-new StewardHQ project, run only:

```text
supabase/schema.sql
```

The consolidated schema includes V1.1 capabilities plus multi-tenancy. Do **not** also apply migrations 002/003 to a fresh database.

For an already-deployed V1.1 database, use `supabase/migrations/003_multi_tenant.sql` as the upgrade path.

## Local run

```bash
cp .env.example .env.local
npm install
npm run dev
```

Without Supabase variables the app intentionally runs in **PREVIEW** mode. With Supabase configured, protected pages require authentication.

## Commercial tenancy model

```text
StewardHQ
  ├── Organization A
  │    ├── Owners / Admins / Members / Viewers
  │    ├── Businesses
  │    ├── Projects + Tasks
  │    ├── AI Workforce
  │    ├── Approvals
  │    └── Memory / Decisions / Audit
  │
  └── Organization B
       └── completely isolated by RLS
```

The active workspace is resolved server-side. Every normal data query includes `organization_id`, while Supabase RLS independently enforces membership so URL/API manipulation cannot cross tenant boundaries.

## Role model

| Role | Intended access |
| --- | --- |
| Owner | Full workspace control, membership governance, approvals |
| Admin | Operational administration and approvals; cannot govern Owner roles |
| Member | Work tasks, run operational AI, request approvals |
| Viewer | Read-only operating visibility |

AI authority levels remain separate from human membership roles:

- L0 Observe
- L1 Prepare
- L2 Internal execute
- L3 Controlled external execute
- L4 Human approval required
- L5 Prohibited autonomously

## Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

OPENAI_API_KEY=
OPENAI_MODEL=

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=

ACCIO_BRIDGE_URL=
ACCIO_BRIDGE_TOKEN=
```

Model IDs are intentionally environment-controlled rather than hard-coded so StewardHQ can change providers/models without a product migration.

## Next implementation target

1. Create the dedicated **StewardHQ** Supabase project.
2. Apply `supabase/schema.sql` and run Security + Performance Advisors.
3. Create the first Auth account and first workspace.
4. Seed the private owner portfolio into that workspace.
5. Generate Supabase TypeScript types and wire them into the app.
6. Connect OpenAI and Claude.
7. Build the Accio adapter/MCP task dispatch + status callback.
8. Deploy StewardHQ and certify desktop + phone operation.
