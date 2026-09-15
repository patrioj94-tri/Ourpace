import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/** Supabase as the signed-in person. Respects row-level security. */
export async function supabaseServer() {
  const jar = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => jar.set(name, value, options));
          } catch {
            // Called from a server component, where cookies are read-only.
            // The middleware refreshes the session instead.
          }
        },
      },
    },
  );
}
