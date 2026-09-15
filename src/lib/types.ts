export type Discipline = 'swim' | 'bike' | 'run' | 'strength' | 'rest' | 'other';
export type SessionStatus = 'planned' | 'done' | 'missed' | 'skipped';
export type DreamState = 'someday' | 'planning' | 'booked' | 'done';

export type Profile = {
  id: string;
  email: string;
  short_name: string;
  color: 'swim' | 'bike' | 'run' | 'accent';
  avatar_url: string | null;
};

export type Settings = {
  race_name: string;
  race_date: string;
  race_location: string | null;
  time_zone: string;
};

export type Activity = {
  id: number;
  profile_id: string;
  sport_type: string;
  discipline: Discipline;
  name: string | null;
  start_local: string;
  distance_m: number | null;
  moving_time_s: number | null;
  elapsed_time_s: number | null;
  elevation_m: number | null;
  avg_speed: number | null;
  avg_heartrate: number | null;
  calories: number | null;
};

export type Session = {
  id: string;
  profile_id: string;
  date: string;
  discipline: Discipline;
  title: string;
  target: string | null;
  target_distance_m: number | null;
  target_duration_s: number | null;
  phase: string | null;
  week_number: number | null;
  status: SessionStatus;
  activity_id: number | null;
  matched_automatically: boolean;
  completed_at: string | null;
  notes: string | null;
  position: number;
};

export type SessionWithActivity = Session & { activity: Activity | null };

export type Todo = {
  id: string;
  body: string;
  assignee_id: string | null;
  due_on: string | null;
  done: boolean;
  done_by: string | null;
  done_at: string | null;
  position: number;
};

export type Dream = {
  id: string;
  title: string;
  note: string | null;
  category: string | null;
  state: DreamState;
  target_date: string | null;
  cost_estimate: number | null;
  saved: number;
  position: number;
};

export type Game = { id: string; name: string; emoji: string | null };

export type Battle = {
  id: string;
  game_id: string;
  winner_id: string;
  played_on: string;
  note: string | null;
};

export type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  calendarName: string;
  ownerId: string;
  ownerName: string;
  location: string | null;
};
