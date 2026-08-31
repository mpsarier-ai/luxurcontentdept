-- ═══ TIENDA FÍSICA · contador de personas + ventas POS ═══
-- El contador (tienda.html) escribe por RPC con token, igual que el
-- link de proveedores. El dashboard lee con la sesión del equipo.

create table if not exists public.store_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('entry','open','close')),
  at timestamptz not null default now(),
  local_day date not null default ((now() at time zone 'America/Bogota')::date),
  device text
);
create index if not exists store_events_day_idx on public.store_events(local_day, kind);

create table if not exists public.store_settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'LUXUR Medellín',
  counter_token uuid not null
);
insert into public.store_settings (id, store_name, counter_token)
values (1, 'LUXUR Medellín', 'ab64f84a-67f2-4294-9c58-ed4ddd72c20a')
on conflict (id) do nothing;

-- Ventas del POS por día (las llena refresh-shopify)
create table if not exists public.pos_daily (
  day date primary key,
  orders int not null default 0,
  gross numeric not null default 0,
  units int not null default 0,
  updated_at timestamptz default now()
);

alter table public.store_events  enable row level security;
alter table public.store_settings enable row level security;
alter table public.pos_daily     enable row level security;

drop policy if exists store_events_team on public.store_events;
create policy store_events_team on public.store_events
  for select to authenticated using (public.is_team_member());
drop policy if exists store_settings_team on public.store_settings;
create policy store_settings_team on public.store_settings
  for select to authenticated using (public.is_team_member());
drop policy if exists pos_daily_team on public.pos_daily;
create policy pos_daily_team on public.pos_daily
  for select to authenticated using (public.is_team_member());

-- ── RPCs del contador (token, sin cuenta) ──
create or replace function public.store_tap(p_token uuid, p_device text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not exists (select 1 from store_settings where counter_token = p_token) then
    raise exception 'token inválido';
  end if;
  insert into store_events (kind, device) values ('entry', p_device);
  select count(*) into v_count from store_events
   where kind = 'entry' and local_day = (now() at time zone 'America/Bogota')::date;
  return jsonb_build_object('today', v_count);
end $$;

create or replace function public.store_undo(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not exists (select 1 from store_settings where counter_token = p_token) then
    raise exception 'token inválido';
  end if;
  delete from store_events where id = (
    select id from store_events
     where kind = 'entry' and local_day = (now() at time zone 'America/Bogota')::date
     order by at desc limit 1);
  select count(*) into v_count from store_events
   where kind = 'entry' and local_day = (now() at time zone 'America/Bogota')::date;
  return jsonb_build_object('today', v_count);
end $$;

create or replace function public.store_toggle(p_token uuid, p_open boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from store_settings where counter_token = p_token) then
    raise exception 'token inválido';
  end if;
  insert into store_events (kind) values (case when p_open then 'open' else 'close' end);
  return jsonb_build_object('open', p_open);
end $$;

create or replace function public.store_state(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_count int; v_last record;
begin
  if not exists (select 1 from store_settings where counter_token = p_token) then
    raise exception 'token inválido';
  end if;
  select count(*) into v_count from store_events
   where kind = 'entry' and local_day = (now() at time zone 'America/Bogota')::date;
  select kind, at into v_last from store_events
   where kind in ('open','close') and local_day = (now() at time zone 'America/Bogota')::date
   order by at desc limit 1;
  return jsonb_build_object(
    'today', v_count,
    'open', coalesce(v_last.kind = 'open', false),
    'since', v_last.at);
end $$;

-- La llena refresh-shopify (mismo patrón que rpc_update_shopify_data)
create or replace function public.rpc_update_pos_daily(p_days jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare d jsonb;
begin
  for d in select * from jsonb_array_elements(p_days) loop
    insert into pos_daily (day, orders, gross, units, updated_at)
    values ((d->>'day')::date, (d->>'orders')::int, (d->>'gross')::numeric, (d->>'units')::int, now())
    on conflict (day) do update
      set orders = excluded.orders, gross = excluded.gross,
          units = excluded.units, updated_at = now();
  end loop;
end $$;

revoke all on function public.store_tap(uuid, text) from public;
revoke all on function public.store_undo(uuid) from public;
revoke all on function public.store_toggle(uuid, boolean) from public;
revoke all on function public.store_state(uuid) from public;
revoke all on function public.rpc_update_pos_daily(jsonb) from public;
grant execute on function public.store_tap(uuid, text) to anon, authenticated;
grant execute on function public.store_undo(uuid) to anon, authenticated;
grant execute on function public.store_toggle(uuid, boolean) to anon, authenticated;
grant execute on function public.store_state(uuid) to anon, authenticated;
grant execute on function public.rpc_update_pos_daily(jsonb) to anon, authenticated;

-- ═══ TIENDA ONLINE · ventas del canal Online Store por día ═══
create table if not exists public.online_daily (
  day date primary key,
  orders int not null default 0,
  gross numeric not null default 0,
  units int not null default 0,
  updated_at timestamptz default now()
);
alter table public.online_daily enable row level security;
drop policy if exists online_daily_team on public.online_daily;
create policy online_daily_team on public.online_daily
  for select to authenticated using (public.is_team_member());

create or replace function public.rpc_update_online_daily(p_days jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare d jsonb;
begin
  for d in select * from jsonb_array_elements(p_days) loop
    insert into online_daily (day, orders, gross, units, updated_at)
    values ((d->>'day')::date, (d->>'orders')::int, (d->>'gross')::numeric, (d->>'units')::int, now())
    on conflict (day) do update
      set orders = excluded.orders, gross = excluded.gross,
          units = excluded.units, updated_at = now();
  end loop;
end $$;

revoke all on function public.rpc_update_online_daily(jsonb) from public;
grant execute on function public.rpc_update_online_daily(jsonb) to anon, authenticated;
