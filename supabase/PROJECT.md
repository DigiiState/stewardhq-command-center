# StewardHQ Production Supabase

- Project name: StewardHQ Project
- Project ref: `afnefuegygoooxaaluga`
- Region: `us-east-1`
- Status at bootstrap: ACTIVE_HEALTHY
- Production URL: `https://afnefuegygoooxaaluga.supabase.co`
- Auth users at bootstrap: 0

## Applied production migrations

1. `20260823024249_stewardhq_multitenant_foundation`
2. `20260823024308_stewardhq_performance_hardening`

## Advisor status

- Security advisor: 0 findings after foundation migration.
- Performance advisor: only expected INFO notices for currently-unused indexes on an empty database and the Auth connection strategy notice.

## Next bootstrap action

The first authenticated user should create the first organization/workspace through StewardHQ onboarding. Do not seed an owner organization without a real `auth.users.id`.
