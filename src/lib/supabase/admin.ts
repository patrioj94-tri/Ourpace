import { createClient } from '@supabase/supabase-js';

/**
 * Supabase with the service-role key: bypasses row-level security.
 * Only ever import this from a route handler or a scheduled job — never from
 * anything that reaches the browser.
 */
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
