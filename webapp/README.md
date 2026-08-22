# NightOwl webapp (Supabase-backed)

A small, real, working app — auth, watchlist, and ratings, persisted per-user
in Supabase. This is **separate from** `NightOwl.dc.html` (see the root
[README](../README.md)): the `.dc.html` file is a design-reference artifact
in Claude's Design Canvas format and isn't runnable as a normal web page.
This folder is a plain HTML/CSS/JS app that actually runs in a browser,
styled to match NightOwl's design tokens.

## Setup

1. **Create/open a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the schema**: open the SQL Editor in your Supabase dashboard, paste
   the contents of [`../supabase/schema.sql`](../supabase/schema.sql), and
   run it. This creates `watchlist_items` and `ratings` tables with Row
   Level Security so each user can only see/edit their own rows.
3. **Configure the client**: edit [`config.js`](config.js) with your
   project's URL and anon/public key (Dashboard → Project Settings → API).
   The anon key is safe to expose client-side — it's public by design, and
   access is enforced by the RLS policies in the schema, not by secrecy.
4. **Enable email auth** (on by default in new Supabase projects): Dashboard
   → Authentication → Providers → Email.
   - If "Confirm email" is on, new sign-ups must click a confirmation email
     link before they can sign in. You can turn this off in Authentication →
     Providers → Email for faster local testing.
5. **Run it**: this app has no build step. Serve the folder with any static
   file server and open it, e.g.:
   ```bash
   npx serve webapp
   ```
   or just open `webapp/index.html` directly in a browser (Supabase auth
   works fine over `file://` for local testing, but use a real server for
   anything beyond that).

## What it does

- **Auth** — email/password sign up, sign in, sign out via Supabase Auth.
  Session persists across reloads (Supabase client handles this).
- **Watchlist** — add a movie (title, optional year and poster URL), see it
  under "To watch", mark it "Watched" (or move it back), remove it.
- **Ratings** — once a movie is marked watched, a 5-star control and an
  optional note appear; both save to the `ratings` table, scoped to the
  signed-in user.

## Data model

- `watchlist_items` — one row per movie a user has added. `status` is
  `to_watch` or `watched`.
- `ratings` — one row per `(user, watchlist_item)`, `rating` 0–5, optional
  `note`. Upserted on `(user_id, watchlist_item_id)`.

Both tables have RLS policies restricting all reads/writes to
`auth.uid() = user_id`, so one user can never see or modify another user's
data even though everyone shares the same anon key.

## Not included (by design, to keep this focused)

- TMDB search/integration — add movies by title manually for now. The root
  README's production notes on proxying TMDB server-side still apply if you
  wire that in later.
- The full NightOwl UI (screens, gamification, quiz, etc.) — this app covers
  only the three features asked for: auth, watchlist, ratings.
