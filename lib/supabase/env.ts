// A thin wrapper around process.env so we get a clear error message at boot
// when one of the required Supabase env vars is missing -- instead of a
// generic "undefined is not a function" deep inside the SDK.

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Check your .env.local file (see .env.example).`,
    );
  }
  return value;
}

export const env = {
  // Public Supabase values -- safe in the browser
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },

  // Server-only values. These should *never* be referenced from a client
  // component or a "use client" file -- doing so will throw at runtime.
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get ingestSecret() {
    return required("INGEST_SECRET", process.env.INGEST_SECRET);
  },

  // Public Google Form URLs. These can be empty during local dev -- the
  // /forms page handles the empty case gracefully.
  get gformUsedUrl() {
    return process.env.NEXT_PUBLIC_GFORM_USED_URL ?? "";
  },
  get gformRequestUrl() {
    return process.env.NEXT_PUBLIC_GFORM_REQUEST_URL ?? "";
  },
};
