-- Run this once, after 0001_init.sql.
-- Replace Jean's address before you run it — it is the only thing that lets him in.

insert into public.allowed_emails (email, short_name, color) values
  ('patrioj94@gmail.com',          'Patri', 'swim'),
  ('jean.schoenlaub@example.com',  'Jean',  'bike')   -- <-- his real address goes here
on conflict (email) do update
  set short_name = excluded.short_name,
      color      = excluded.color;

insert into public.settings (id, race_name, race_date, race_location, time_zone)
values (true, 'Ironman 70.3 Málaga', '2027-10-10', 'Málaga, Spain', 'Europe/Madrid')
on conflict (id) do nothing;

insert into public.games (name, emoji) values
  ('7 Wonders Duel', '🏛️'),
  ('Catan',          '🐑'),
  ('Padel',          '🎾'),
  ('Mario Kart',     '🏎️'),
  ('Chess',          '♟️'),
  ('Backgammon',     '🎲')
on conflict (name) do nothing;
