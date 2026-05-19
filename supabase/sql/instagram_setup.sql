-- LUXUR Calendar — Instagram feed integration
-- Run this once in the Supabase SQL Editor.

-- 1. Real published feed (single row, id=1). Read-only for the team.
create table if not exists public.instagram_feed (
  id smallint primary key default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.instagram_feed enable row level security;
drop policy if exists "team read ig feed" on public.instagram_feed;
create policy "team read ig feed" on public.instagram_feed
  for select using (is_team_member());

-- 2. Integration token state. NO anon/team policy on purpose:
--    only the Edge Function (service_role, bypasses RLS) ever touches it,
--    so the long-lived token is never exposed to the public anon key.
create table if not exists public.integration_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.integration_state enable row level security;

-- 3. Cron: refresh the feed every 30 min (free, zero Claude cost).
--    Replace <FUNCTION_URL> with the deployed function URL and <ANON_KEY>
--    with the project anon key (same pattern as refresh-shopify-30min).
-- select cron.unschedule('refresh-instagram-30min');
select cron.schedule(
  'refresh-instagram-30min',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := '<FUNCTION_URL>',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
