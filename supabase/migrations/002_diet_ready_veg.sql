-- Run this ONCE in the Supabase SQL editor on your existing project, BEFORE deploying the new code.
-- (Fresh installs get all of this from schema.sql already.)
-- It is safe to run more than once.

-- Veg / non-veg: what each person can eat today
alter table attendance add column if not exists diet text check (diet in ('veg', 'nonveg'));

-- Veg / non-veg marker on each dish
alter table dishes add column if not exists is_veg boolean not null default true;
update dishes set is_veg = false where name in ('Egg Curry', 'Chicken Curry', 'Egg Bhurji');

-- "Food is ready" announcement for the day
alter table dinner_days add column if not exists ready_at timestamptz;
alter table dinner_days add column if not exists ready_by uuid references members(id) on delete set null;
