-- Garbage-day space (separate group, members and invite code from dinner).
-- Safe to run more than once. Run it BEFORE deploying the new code.

alter table households add column if not exists kind text not null default 'dinner'
  check (kind in ('dinner', 'garbage'));
alter table households add column if not exists anchor_date date;

create table if not exists garbage_days (
  household_id uuid not null references households(id) on delete cascade,
  date date not null,
  assigned_to uuid references members(id) on delete set null,
  done_at timestamptz,
  done_by uuid references members(id) on delete set null,
  primary key (household_id, date)
);
alter table garbage_days enable row level security;

-- One phone can now be signed in to both spaces, so a push endpoint may belong to two members.
alter table push_subscriptions drop constraint if exists push_subscriptions_endpoint_key;
create unique index if not exists push_subs_member_endpoint on push_subscriptions (member_id, endpoint);
