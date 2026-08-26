import { signIn } from "@/app/actions/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <div className="page loginPage">
      <section className="loginCard">
        <div className="eyebrow">STEWARDHQ</div>
        <h2>Executive sign in</h2>
        <p>
          Sign in to your StewardHQ account. Your workspace memberships determine which
          businesses, AI workers, approvals and operating data you can access.
        </p>

        {!configured && (
          <div className="configNotice">
            Supabase is not configured yet. Add the project URL and publishable
            key to <code>.env.local</code> before using live authentication.
          </div>
        )}

        {params.error && <div className="errorNotice">{params.error}</div>}

        <form action={signIn} className="loginForm">
          <input type="hidden" name="next" value={params.next ?? "/"} />
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required disabled={!configured} />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required disabled={!configured} />
          </label>
          <button className="primaryButton" type="submit" disabled={!configured}>
            Sign in
          </button>
        </form>
      </section>
    </div>
  );
}
