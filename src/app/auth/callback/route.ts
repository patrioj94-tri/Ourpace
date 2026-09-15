import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Google sends everyone back here. One sign-in does two jobs: it proves who
 * you are, and it hands us the refresh token we need to read your calendar.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (!code) return NextResponse.redirect(`${origin}/login?error=missing_code`);

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    // The sign-up trigger turns away anyone not on the guest list.
    const reason = error?.message.includes('private') ? 'not_invited' : 'sign_in_failed';
    return NextResponse.redirect(`${origin}/login?error=${reason}`);
  }

  const refresh = data.session.provider_refresh_token;
  if (refresh) {
    await supabaseAdmin()
      .from('google_accounts')
      .upsert(
        { profile_id: data.session.user.id, refresh_token: refresh },
        { onConflict: 'profile_id' },
      );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
