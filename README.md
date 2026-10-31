# Dinner Menu

A small, beautiful web app for a household to decide dinner together.

Each day: everyone says **in / skip**, then proposes and agrees on a **gravy**, a **fry** and a **staple**. The host locks the menu (or it auto-locks at the lock time). Installable on phones as an app, with push reminders.

Stack: Next.js (App Router) on Vercel, Supabase Postgres, Tailwind, Framer Motion, Vaul.

## How it works

- **Login:** pick your name, enter a 4-digit PIN. The first person to open a fresh deployment creates the family and becomes the host; others join with the host's invite code (Me tab).
- **Voting:** each member has one pick per slot. Tapping *Agree* on someone's dish sets your pick to it; *Prefer something else* opens the dish picker (or add a brand new dish). A slot is **Agreed** when every attending member picked the same dish.
- **Locking:** the host can lock any time (choosing a winner where votes are split). Otherwise it auto-locks at the lock time (default 6:00 PM): most votes wins, ties go to the host's pick, then the earliest pick. The host can reopen voting.
- **Reminders:** push notification at the reminder time (default 5:00 PM) and when the menu locks.
- **Timezone:** `Asia/Kolkata` by default (`DEFAULT_TIMEZONE` env var).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

With no Supabase variables set, data is stored in `.data/db.json` (local dev only). Delete that folder to start fresh.

`npm run smoke` starts the app, seeds a demo family, and saves mobile screenshots to `.shots/`.

## Deploy for free (Vercel + Supabase)

### 1. Supabase (database)
1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. **SQL Editor** > New query > paste [`supabase/schema.sql`](supabase/schema.sql) > Run.
3. **Project Settings > API**: copy the **Project URL** and the **service_role** key (keep it secret).

### 2. Vercel (hosting)
1. Push this folder to a GitHub repo.
2. At [vercel.com](https://vercel.com): **Add New > Project** > import the repo.
3. Add environment variables (see [`env.example`](env.example)):

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
| `SESSION_SECRET` | long random string (`openssl rand -base64 32`) |
| `CRON_SECRET` | another long random string |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | optional, for push (`npx web-push generate-vapid-keys`) |

4. Deploy. Open the URL **immediately** and create your family (the first visitor becomes the host).

### 3. Reliable reminders and auto-lock (recommended)
The menu already auto-locks the first time anyone opens the app after the lock time, and `vercel.json` has a once-a-day cron (free tier limit). For on-time push notifications, run [`supabase/cron.sql`](supabase/cron.sql) in the Supabase SQL editor after replacing the two placeholders. It pings `/api/cron/tick` every 5 minutes (idempotent).

### 4. Install on phones
- **Android (Chrome):** menu > Install app, then Me tab > Reminders > Turn on.
- **iPhone (iOS 16.4+):** Safari > Share > Add to Home Screen, open it from the home screen, then Me tab > Reminders > Turn on.

## Security notes
- All database access happens on the server with the service-role key. Row level security is on with no policies, so the public anon key can read nothing.
- PINs are bcrypt-hashed; 5 wrong tries locks that member for 10 minutes.
- The sign-in screen lists member first names (needed for the tap-your-name UI). Don't post the link publicly.
- A 4-digit PIN is convenience-grade protection, fine for a family dinner app.
