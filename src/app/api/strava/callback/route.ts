import { NextResponse, type NextRequest } from 'next/server';
import { exchangeCode } from '@/lib/strava';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const site = process.env.NEXT_PUBLIC_SITE_URL!;
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(`${site}/settings?strava=cancelled`);

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${site}/login`);

  try {
    const tokens = await exchangeCode(code);

    await supabaseAdmin().from('strava_accounts').upsert(
      {
        profile_id: user.id,
        athlete_id: tokens.athlete?.id ?? 0,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expires_at * 1000).toISOString(),
        scope: tokens.scope ?? null,
      },
      { onConflict: 'profile_id' },
    );

    // Pull the last month straight away, so the app has something to show.
    await fetch(`${site}/api/strava/sync?days=30`, {
      headers: { cookie: request.headers.get('cookie') ?? '' },
    }).catch(() => {});

    return NextResponse.redirect(`${site}/settings?strava=connected`);
  } catch {
    return NextResponse.redirect(`${site}/settings?strava=failed`);
  }
}
