-- Optional but recommended: precise reminders and auto-lock.
-- Run AFTER deploying to Vercel. Replace the two placeholders first.
--
-- The tick endpoint is idempotent: it sends the reminder once and locks the menu once the
-- configured times have passed, so calling it every 5 minutes is safe.
-- (Even without this, the menu auto-locks the first time anyone opens the app after the
--  lock time. This job is what delivers the push notifications on time.)

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'dinner-menu-tick',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-APP.vercel.app/api/cron/tick',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
  );
  $$
);

-- To remove it later:  select cron.unschedule('dinner-menu-tick');
