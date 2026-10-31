-- Dinner Menu: run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- All access goes through the Next.js server using the service-role key, so row level
-- security is enabled with NO policies: the public anon key can read nothing.

create table if not exists households (
  id uuid primary key,
  name text not null,
  join_code text not null unique,
  timezone text not null default 'Asia/Kolkata',
  remind_time text not null default '17:00',
  lock_time text not null default '18:00',
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  pin_hash text not null,
  is_host boolean not null default false,
  color text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists members_unique_name on members (household_id, lower(name));

create table if not exists dishes (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  category text not null check (category in ('gravy', 'fry', 'staple')),
  name text not null,
  emoji text not null,
  added_by uuid references members(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists dishes_household on dishes (household_id);

create table if not exists dinner_days (
  household_id uuid not null references households(id) on delete cascade,
  date date not null,
  locked boolean not null default false,
  locked_by uuid references members(id) on delete set null,
  locked_at timestamptz,
  host_unlocked boolean not null default false,
  primary key (household_id, date)
);

create table if not exists attendance (
  household_id uuid not null references households(id) on delete cascade,
  date date not null,
  member_id uuid not null references members(id) on delete cascade,
  attending boolean not null,
  updated_at timestamptz not null default now(),
  primary key (household_id, date, member_id)
);

-- One row per member per slot per day: "this is the dish I want / agree with".
create table if not exists picks (
  household_id uuid not null references households(id) on delete cascade,
  date date not null,
  category text not null check (category in ('gravy', 'fry', 'staple')),
  member_id uuid not null references members(id) on delete cascade,
  dish_id uuid not null references dishes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (household_id, date, category, member_id)
);

create table if not exists final_menu (
  household_id uuid not null references households(id) on delete cascade,
  date date not null,
  category text not null check (category in ('gravy', 'fry', 'staple')),
  dish_id uuid not null references dishes(id) on delete cascade,
  primary key (household_id, date, category)
);

create table if not exists push_subscriptions (
  id uuid primary key,
  member_id uuid not null references members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- Makes reminders / lock announcements fire at most once per day.
create table if not exists notification_log (
  household_id uuid not null references households(id) on delete cascade,
  date date not null,
  kind text not null,
  created_at timestamptz not null default now(),
  primary key (household_id, date, kind)
);

alter table households enable row level security;
alter table members enable row level security;
alter table dishes enable row level security;
alter table dinner_days enable row level security;
alter table attendance enable row level security;
alter table picks enable row level security;
alter table final_menu enable row level security;
alter table push_subscriptions enable row level security;
alter table notification_log enable row level security;
