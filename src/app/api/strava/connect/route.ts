import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** Sends you to Strava to say yes. */
export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/login`);

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    // read_all so private activities count too — plenty of sessions are private.
    scope: 'read,activity:read_all',
    state: user.id,
  });

  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${params}`);
}
