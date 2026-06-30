import { createClient } from "@/lib/supabase/server";

/**
 * Top-of-dashboard greeting. Pulls first/last name from the `profiles`
 * table, falling back to the email username if those aren't filled in
 * (which is the case until the admin updates them from /admin/settings).
 */
export async function WelcomeHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "there";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

    const first = profile?.first_name?.trim();
    const last = profile?.last_name?.trim();
    if (first && last) {
      displayName = `${first} ${last}`;
    } else if (first) {
      displayName = first;
    } else if (user.email) {
      displayName = user.email.split("@")[0];
    }
  }

  // Hour-aware greeting -- "Good morning" before noon, etc.
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <header>
      <p className="text-xs font-medium uppercase tracking-wider text-blue-700">{greeting}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Welcome back, {displayName}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Here&apos;s what the maintenance team has been up to.
      </p>
    </header>
  );
}
