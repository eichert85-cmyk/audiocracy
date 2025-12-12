// lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server Component / server-side Supabase client.
 * - Uses Next.js 16 async cookies()
 * - Read-only: no cookie writes here (token refresh should be handled via middleware if needed)
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const c = cookieStore.get(name);
          return c?.value;
        },

        // No-ops: Server Components cannot set cookies
        async set() {},
        async remove() {},
      },
    }
  );
}
