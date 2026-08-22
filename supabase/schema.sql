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
