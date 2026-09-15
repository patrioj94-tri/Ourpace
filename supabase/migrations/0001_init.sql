-- Our Pace — initial schema.
-- Two people share every row in here, so the security model is simple:
-- you are either one of them, or you see nothing at all.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- people --

-- The guest list. Only an address sitting in here can ever hold an account.
create table public.allowed_emails (
  email      text primary key,
  short_name text not null,
  color      text not null default 'swim'
);

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text unique not null,
  short_name text not null,
  color      text not null default 'swim' check (color in ('swim','bike','run','accent')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Turns a new sign-in into a profile, and turns anybody else away.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invited public.allowed_emails%rowtype;
begin
  select * into invited
    from public.allowed_emails
   where lower(email) = lower(new.email);

  if not found then
    raise exception 'Our Pace is private.';
  end if;

  insert into public.profiles (id, email, short_name, color)
  values (new.id, lower(new.email), invited.short_name, invited.color)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Every policy below leans on this.
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

-- ------------------------------------------------------------- the race --

-- One row, always. The race everything else counts down to.
create table public.settings (
  id            boolean primary key default true check (id),
  race_name     text not null default 'Ironman 70.3 Málaga',
  race_date     date not null default '2027-10-10',
  race_location text default 'Málaga, Spain',
  time_zone     text not null default 'Europe/Madrid',
  started_on    date not null default current_date
);

-- ---------------------------------------------------------------- training --

create type public.discipline     as enum ('swim','bike','run','strength','rest','other');
create type public.session_status as enum ('planned','done','missed','skipped');

-- What Strava told us actually happened.
create table public.activities (
  id             bigint primary key,            -- Strava's own activity id
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  sport_type     text not null,
  discipline     public.discipline not null,
  name           text,
  start_local    timestamp not null,
  distance_m     double precision,
  moving_time_s  integer,
  elapsed_time_s integer,
  elevation_m    double precision,
  avg_speed      double precision,
  avg_heartrate  double precision,
  calories       integer,
  raw            jsonb,
  created_at     timestamptz not null default now()
);

-- What the plan says should happen.
create table public.sessions (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  date              date not null,
  discipline        public.discipline not null,
  title             text not null,
  target            text,                       -- "6 × 800 m @ 4:15 /km"
  target_distance_m integer,
  target_duration_s integer,
  phase             text,                       -- base / build / peak / taper
  week_number       integer,
  status            public.session_status not null default 'planned',
  activity_id       bigint references public.activities(id) on delete set null,
  matched_automatically boolean not null default false,
  completed_at      timestamptz,
  notes             text,
  google_event_id   text,
  position          integer not null default 0,
  created_at        timestamptz not null default now()
);

create index sessions_by_person_date on public.sessions (profile_id, date);
create index sessions_open           on public.sessions (date) where status = 'planned';
create index activities_by_person    on public.activities (profile_id, start_local desc);

-- ------------------------------------------------------------ the rest --

create table public.todos (
  id          uuid primary key default gen_random_uuid(),
  body        text not null,
  assignee_id uuid references public.profiles(id) on delete set null,  -- null means both of us
  due_on      date,
  done        boolean not null default false,
  done_by     uuid references public.profiles(id) on delete set null,
  done_at     timestamptz,
  position    integer not null default 0,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create type public.dream_state as enum ('someday','planning','booked','done');

create table public.dreams (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  note          text,
  category      text,
  state         public.dream_state not null default 'someday',
  target_date   date,
  cost_estimate integer,          -- whole euros, near enough for a daydream
  saved         integer not null default 0,
  image_url     text,
  position      integer not null default 0,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table public.games (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  emoji      text,
  created_at timestamptz not null default now()
);

create table public.battles (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  winner_id  uuid not null references public.profiles(id) on delete cascade,
  played_on  date not null default current_date,
  note       text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index battles_by_game on public.battles (game_id, played_on desc);

-- Write something now, read it on a date you choose.
create table public.letters (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  title        text,
  body         text not null,
  unlock_on    date not null,
  opened_at    timestamptz,
  created_at   timestamptz not null default now()
);

-- The Sunday summary.
create table public.weekly_notes (
  id         uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  body       text not null,
  stats      jsonb,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------- tokens --
-- Nobody signed in can read these. Only the server, which bypasses RLS.

create table public.strava_accounts (
  profile_id    uuid primary key references public.profiles(id) on delete cascade,
  athlete_id    bigint unique not null,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  scope         text,
  last_synced_at timestamptz,
  connected_at  timestamptz not null default now()
);

create table public.google_accounts (
  profile_id    uuid primary key references public.profiles(id) on delete cascade,
  refresh_token text not null,
  calendar_ids  text[] not null default '{}',
  write_calendar_id text,
  connected_at  timestamptz not null default now()
);

-- ------------------------------------------------------ row-level security --

alter table public.profiles        enable row level security;
alter table public.settings        enable row level security;
alter table public.activities      enable row level security;
alter table public.sessions        enable row level security;
alter table public.todos           enable row level security;
alter table public.dreams          enable row level security;
alter table public.games           enable row level security;
alter table public.battles         enable row level security;
alter table public.weekly_notes    enable row level security;
alter table public.letters         enable row level security;
alter table public.allowed_emails  enable row level security;
alter table public.strava_accounts enable row level security;
alter table public.google_accounts enable row level security;

-- The two of them share everything, so one policy shape covers most tables.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','settings','activities','sessions','todos',
    'dreams','games','battles','weekly_notes'
  ]
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.is_member()) with check (public.is_member())',
      t || '_shared', t);
  end loop;
end;
$$;

-- A letter stays shut until its date, even from the person it is for.
create policy letters_read on public.letters
  for select to authenticated
  using (public.is_member() and (unlock_on <= current_date or author_id = auth.uid()));

create policy letters_write on public.letters
  for insert to authenticated
  with check (public.is_member() and author_id = auth.uid());

create policy letters_open on public.letters
  for update to authenticated
  using (public.is_member() and unlock_on <= current_date)
  with check (public.is_member());

-- allowed_emails, strava_accounts and google_accounts get RLS and no policies:
-- unreachable from the browser, readable by the server.

-- ------------------------------------------------------------- realtime --
-- So a tick on one phone lands on the other without a refresh.

alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.todos;
alter publication supabase_realtime add table public.dreams;
alter publication supabase_realtime add table public.battles;
alter publication supabase_realtime add table public.activities;
