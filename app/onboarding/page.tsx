import { createOrganization } from "@/app/actions/organization";
import { getWorkspaceContext } from "@/lib/tenancy/context";
import { redirect } from "next/navigation";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const context = await getWorkspaceContext();

  if (context.mode === "preview") redirect("/");
  if (!context.userId) redirect("/login");
  if (context.active) redirect("/");

  return (
    <div className="page loginPage">
      <section className="loginCard">
        <div className="eyebrow">STEWARDHQ</div>
        <h2>Create your first workspace</h2>
        <p>
          A workspace is the secure container for one owner or company group. Businesses,
          projects, AI workers, approvals and memory inside it are isolated from every other customer.
        </p>
        {params.error && <div className="errorNotice">{params.error}</div>}
        <form action={createOrganization} className="loginForm">
          <label>
            Workspace name
            <input name="name" placeholder="Example: Aguillera Portfolio" minLength={2} maxLength={100} required autoFocus />
          </label>
          <button className="primaryButton" type="submit">Create workspace</button>
        </form>
      </section>
    </div>
  );
}
