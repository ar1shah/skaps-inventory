/**
 * One-time script to bootstrap the first admin user.
 *
 * Usage:
 *   pnpm tsx supabase/seed/create_admin.ts <email> <password> <first> <last>
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in your
 * environment (they're loaded from .env.local via dotenv).
 *
 * After running this script you can sign in at /login with the email and
 * password you supplied. Add more admins later from /admin/settings.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const [email, password, firstName, lastName] = process.argv.slice(2);

  if (!email || !password || !firstName || !lastName) {
    console.error(
      "usage: pnpm tsx supabase/seed/create_admin.ts <email> <password> <first> <last>",
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in your environment.",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  if (error) {
    console.error("Failed to create admin:", error.message);
    process.exit(1);
  }

  console.log(`Created admin user ${data.user?.email} (id: ${data.user?.id}).`);
  console.log("You can now sign in at /login.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
