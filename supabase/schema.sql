-- NightOwl watchlist app — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.

-- ────────────────────────────────────────────────────────────
-- Watchlist items: movies a user has added to watch or has watched
-- ────────────────────────────────────────────────────────────
create table if not exists public.watchlist_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title        text not null,
  year         int,
  poster_url   text,
  status       text not null default 'to_watch' check (status in ('to_watch', 'watched')),
  created_at   timestamptz not null default now()
);

create index if not exists watchlist_items_user_id_idx on public.watchlist_items(user_id);

alter table public.watchlist_items enable row level security;

drop policy if exists "watchlist_items_select_own" on public.watchlist_items;
create policy "watchlist_items_select_own" on public.watchlist_items
  for select using (auth.uid() = user_id);

drop policy if exists "watchlist_items_insert_own" on public.watchlist_items;
create policy "watchlist_items_insert_own" on public.watchlist_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "watchlist_items_update_own" on public.watchlist_items;
create policy "watchlist_items_update_own" on public.watchlist_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "watchlist_items_delete_own" on public.watchlist_items;
create policy "watchlist_items_delete_own" on public.watchlist_items
  for delete using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- Ratings: 0–5 (half-star) rating + optional note for a watched item
-- ────────────────────────────────────────────────────────────
create table if not exists public.ratings (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade default auth.uid(),
  watchlist_item_id  uuid not null references public.watchlist_items(id) on delete cascade,
  rating             numeric(2,1) not null check (rating >= 0 and rating <= 5),
  note               text,
  rated_at           timestamptz not null default now(),
  unique (user_id, watchlist_item_id)
);

create index if not exists ratings_user_id_idx on public.ratings(user_id);

alter table public.ratings enable row level security;

drop policy if exists "ratings_select_own" on public.ratings;
create policy "ratings_select_own" on public.ratings
  for select using (auth.uid() = user_id);

drop policy if exists "ratings_insert_own" on public.ratings;
create policy "ratings_insert_own" on public.ratings
  for insert with check (auth.uid() = user_id);

drop policy if exists "ratings_update_own" on public.ratings;
create policy "ratings_update_own" on public.ratings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ratings_delete_own" on public.ratings;
create policy "ratings_delete_own" on public.ratings
  for delete using (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════
-- Tables below are for NightOwl.dc.html (the full prototype UI),
-- which persists auth/watchlist/ratings directly — separate from
-- webapp/'s simpler watchlist_items/ratings above. NightOwl.dc.html
-- uses named lists (e.g. "The Nest") and TMDB movie ids, so it needs
-- a different shape: one row per list (dc_lists), one row per movie
-- saved into a list (dc_list_items), one row per rating (dc_ratings).
-- ════════════════════════════════════════════════════════════

-- One row per list a user has (built-in lists like "nest" get a row
-- only once something is saved into them via dc_list_items; custom
-- lists get an explicit row here even while empty).
create table if not exists public.dc_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  list_id     text not null,
  list_name   text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, list_id)
);

create index if not exists dc_lists_user_id_idx on public.dc_lists(user_id);

alter table public.dc_lists enable row level security;

drop policy if exists "dc_lists_select_own" on public.dc_lists;
create policy "dc_lists_select_own" on public.dc_lists for select using (auth.uid() = user_id);
drop policy if exists "dc_lists_insert_own" on public.dc_lists;
create policy "dc_lists_insert_own" on public.dc_lists for insert with check (auth.uid() = user_id);
drop policy if exists "dc_lists_update_own" on public.dc_lists;
create policy "dc_lists_update_own" on public.dc_lists for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "dc_lists_delete_own" on public.dc_lists;
create policy "dc_lists_delete_own" on public.dc_lists for delete using (auth.uid() = user_id);

-- One row per movie saved into one of a user's lists. movie_title/
-- movie_poster are denormalized from TMDB so cards can render before
-- the client re-fetches full details.
create table if not exists public.dc_list_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  list_id       text not null,
  list_name     text not null,
  movie_id      bigint not null,
  movie_title   text,
  movie_poster  text,
  added_at      timestamptz not null default now(),
  unique (user_id, list_id, movie_id)
);

create index if not exists dc_list_items_user_id_idx on public.dc_list_items(user_id);

alter table public.dc_list_items enable row level security;

drop policy if exists "dc_list_items_select_own" on public.dc_list_items;
create policy "dc_list_items_select_own" on public.dc_list_items for select using (auth.uid() = user_id);
drop policy if exists "dc_list_items_insert_own" on public.dc_list_items;
create policy "dc_list_items_insert_own" on public.dc_list_items for insert with check (auth.uid() = user_id);
drop policy if exists "dc_list_items_update_own" on public.dc_list_items;
create policy "dc_list_items_update_own" on public.dc_list_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "dc_list_items_delete_own" on public.dc_list_items;
create policy "dc_list_items_delete_own" on public.dc_list_items for delete using (auth.uid() = user_id);

-- One row per (user, movie) rating — 0-5 in half-star steps, plus an
-- optional note. 0 means "marked watched, skipped rating".
create table if not exists public.dc_ratings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  movie_id      bigint not null,
  movie_title   text,
  movie_poster  text,
  rating        numeric(2,1) not null check (rating >= 0 and rating <= 5),
  note          text,
  rated_at      timestamptz not null default now(),
  unique (user_id, movie_id)
);

create index if not exists dc_ratings_user_id_idx on public.dc_ratings(user_id);

alter table public.dc_ratings enable row level security;

drop policy if exists "dc_ratings_select_own" on public.dc_ratings;
create policy "dc_ratings_select_own" on public.dc_ratings for select using (auth.uid() = user_id);
drop policy if exists "dc_ratings_insert_own" on public.dc_ratings;
create policy "dc_ratings_insert_own" on public.dc_ratings for insert with check (auth.uid() = user_id);
drop policy if exists "dc_ratings_update_own" on public.dc_ratings;
create policy "dc_ratings_update_own" on public.dc_ratings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "dc_ratings_delete_own" on public.dc_ratings;
create policy "dc_ratings_delete_own" on public.dc_ratings for delete using (auth.uid() = user_id);
