-- ═══ TIENDA FÍSICA v2 · cantidad de personas por día (sin contador en vivo) ═══
-- Las chicas escriben el total del día en tienda.html. Reemplaza el
-- modelo de taps +1 y abrir/cerrar tienda.

create table if not exists public.store_daily (
  day date primary key,
  visitors int not null default 0 check (visitors >= 0 and visitors < 10000),
  updated_at timestamptz default now()
);
alter table public.store_daily enable row level security;
drop policy if exists store_daily_team on public.store_daily;
create policy store_daily_team on public.store_daily
  for select to authenticated using (public.is_team_member());

-- Pasar lo que ya se contó con taps al modelo por día
insert into public.store_daily (day, visitors)
select local_day, count(*) from public.store_events where kind = 'entry'
group by local_day
on conflict (day) do nothing;

create or replace function public.store_get_day(p_token uuid, p_day date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if not exists (select 1 from store_settings where counter_token = p_token) then
    raise exception 'token inválido';
  end if;
  select visitors into v from store_daily where day = p_day;
  return jsonb_build_object('day', p_day, 'visitors', v, 'saved', v is not null);
end $$;

create or replace function public.store_set_day(p_token uuid, p_day date, p_visitors int)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from store_settings where counter_token = p_token) then
    raise exception 'token inválido';
  end if;
  if p_visitors is null or p_visitors < 0 or p_visitors >= 10000 then
    raise exception 'cantidad inválida';
  end if;
  if p_day > (now() at time zone 'America/Bogota')::date then
    raise exception 'ese día no ha pasado';
  end if;
  insert into store_daily (day, visitors, updated_at) values (p_day, p_visitors, now())
  on conflict (day) do update set visitors = excluded.visitors, updated_at = now();
  return jsonb_build_object('day', p_day, 'visitors', p_visitors, 'saved', true);
end $$;

-- Los RPCs del contador en vivo ya no se usan: se cierran
drop function if exists public.store_tap(uuid, text);
drop function if exists public.store_undo(uuid);
drop function if exists public.store_toggle(uuid, boolean);
drop function if exists public.store_state(uuid);

revoke all on function public.store_get_day(uuid, date) from public;
revoke all on function public.store_set_day(uuid, date, int) from public;
grant execute on function public.store_get_day(uuid, date) to anon, authenticated;
grant execute on function public.store_set_day(uuid, date, int) to anon, authenticated;
