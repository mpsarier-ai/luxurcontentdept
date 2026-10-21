-- ═══ ASESORÍA Q4 · presupuesto (Juliana) + necesidad de producto (María) ═══
-- Entrega 0 del plan: datos sin pantallas.
--   sales_channel_daily  venta neta sin IVA por día y canal (la llena refresh-channels cada hora)
--   budget_daily         presupuesto diario por canal (hoja de Juliana; octubre repartido con sus factores)
--   budget_settings      supuestos: factores por día, ticket por canal, umbrales, stock de seguridad
--   demand_plan          insumos de la hoja de María por categoría, con versiones
--   plan_actions         plan de acción comercial (PAC) de Juliana
--   product_pipeline.category  jeans | tank_tops (para cruzar necesidad con producción)

-- ── Canales ─────────────────────────────────────────────────────────────
-- tienda = Point of Sale · online = Online Store · falabella = canal Falabella
-- whatsapp = Draft Orders + Shopify Mobile + conectores (Claude / CLI)
create table if not exists public.sales_channel_daily (
  day date not null,
  channel text not null check (channel in ('tienda','online','whatsapp','falabella','otro')),
  orders int not null default 0,
  net numeric not null default 0,      -- ventas netas sin IVA (Shopify net_sales)
  units int not null default 0,        -- net_items_sold
  updated_at timestamptz not null default now(),
  primary key (day, channel)
);
alter table public.sales_channel_daily enable row level security;
drop policy if exists sales_channel_daily_team on public.sales_channel_daily;
create policy sales_channel_daily_team on public.sales_channel_daily
  for select to authenticated using (public.is_team_member());

-- ── Presupuesto diario ──────────────────────────────────────────────────
create table if not exists public.budget_daily (
  day date not null,
  channel text not null check (channel in ('tienda','online','whatsapp','falabella')),
  amount numeric not null,             -- COP sin IVA
  event text,
  mult numeric not null default 1,     -- multiplicador del evento (Juliana)
  source text not null default 'juliana',
  primary key (day, channel)
);
alter table public.budget_daily enable row level security;
drop policy if exists budget_daily_team on public.budget_daily;
create policy budget_daily_team on public.budget_daily
  for select to authenticated using (public.is_team_member());

create table if not exists public.budget_settings (
  id int primary key default 1 check (id = 1),
  dow_factors jsonb not null,          -- {"tienda":[lun..dom], "online":[...], "whatsapp":[...]}
  ticket jsonb not null,               -- ticket promedio real por canal (COP sin IVA)
  ticket_source text,
  th_on_target numeric not null default 1.0,   -- EN META desde
  th_attention numeric not null default 0.9,   -- ATENCIÓN desde (debajo = ALERTA)
  th_pace_max numeric not null default 1.1,    -- ritmo requerido máximo antes de ALERTA
  ss_weeks numeric not null default 8,
  discount_obsolete boolean not null default true,
  jan_mult numeric not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.budget_settings enable row level security;
drop policy if exists budget_settings_team on public.budget_settings;
create policy budget_settings_team on public.budget_settings
  for select to authenticated using (public.is_team_member());

-- ── Necesidad de producto (María) ───────────────────────────────────────
create table if not exists public.demand_plan (
  id uuid primary key default gen_random_uuid(),
  version text not null,               -- ej. 'María · 14 oct 2026'
  is_current boolean not null default false,
  category text not null check (category in ('jeans','tank_tops')),
  budget jsonb not null,               -- {"oct":100500000,"nov":210000000,"dic":420000000} sin IVA, toda LUXUR
  share numeric not null,              -- participación de la categoría en la venta neta
  net_price numeric not null,          -- precio neto por unidad sin IVA
  sold_before numeric not null default 0,  -- ya vendido en octubre antes del corte (COP)
  cutoff date not null,                -- fecha del corte de ventas y stock
  stock_active int not null,
  stock_obsolete int not null,
  unit_cost numeric,
  prev_need jsonb,                     -- necesidad de la versión anterior [oct,nov,dic]
  window_label text,                   -- ventana usada para mix y precio
  oct_days_left int not null default 18,   -- días de octubre que cubre la demanda (14 a 31)
  notes text,
  created_at timestamptz not null default now(),
  created_by text
);
create unique index if not exists demand_plan_current_idx on public.demand_plan(category) where is_current;
alter table public.demand_plan enable row level security;
drop policy if exists demand_plan_team on public.demand_plan;
create policy demand_plan_team on public.demand_plan
  for select to authenticated using (public.is_team_member());

-- ── Plan de acción comercial (Juliana) ──────────────────────────────────
create table if not exists public.plan_actions (
  id uuid primary key default gen_random_uuid(),
  month text not null,                 -- 'nov' | 'dic'
  channel text not null,
  goal_m numeric,                      -- meta del mes en millones
  objective text,
  actions text,
  milestones text,
  kpi text,
  owner_role text,                     -- cargo que puso Juliana
  owner text,                          -- persona del equipo (por asignar)
  due_date date,
  status text not null default 'pendiente',
  created_at timestamptz not null default now()
);
alter table public.plan_actions enable row level security;
drop policy if exists plan_actions_team on public.plan_actions;
create policy plan_actions_team on public.plan_actions
  for select to authenticated using (public.is_team_member());

-- ── Categoría en el pipeline ────────────────────────────────────────────
alter table public.product_pipeline add column if not exists category text;
update public.product_pipeline
   set category = case when product_name ilike '%tank%' then 'tank_tops' else 'jeans' end
 where category is null;
alter table public.product_pipeline alter column category set default 'jeans';

create or replace function public.pipeline_set_category() returns trigger
language plpgsql as $$
begin
  if new.category is null or (tg_op = 'INSERT' and new.category = 'jeans' and new.product_name ilike '%tank%') then
    new.category := case when new.product_name ilike '%tank%' then 'tank_tops' else 'jeans' end;
  end if;
  return new;
end $$;
drop trigger if exists pipeline_set_category on public.product_pipeline;
create trigger pipeline_set_category before insert on public.product_pipeline
  for each row execute function public.pipeline_set_category();

-- ── Escritura desde refresh-channels (solo service role) ────────────────
create or replace function public.rpc_update_sales_channel_daily(p_rows jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare d jsonb; n int := 0;
begin
  for d in select * from jsonb_array_elements(p_rows) loop
    insert into sales_channel_daily (day, channel, orders, net, units, updated_at)
    values ((d->>'day')::date, d->>'channel', (d->>'orders')::int, (d->>'net')::numeric, (d->>'units')::int, now())
    on conflict (day, channel) do update
      set orders = excluded.orders, net = excluded.net, units = excluded.units, updated_at = now();
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.rpc_update_sales_channel_daily(jsonb) from public, anon, authenticated;
grant execute on function public.rpc_update_sales_channel_daily(jsonb) to service_role;

-- ── Meta de hoy para tienda.html (token, sin cuenta) ────────────────────
create or replace function public.store_get_goal(p_token uuid, p_day date default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_day date := coalesce(p_day, (now() at time zone 'America/Bogota')::date);
  v_goal numeric; v_event text; v_sold numeric; v_orders int; v_ticket numeric;
  v_m_goal numeric; v_m_goal_td numeric; v_m_sold numeric; v_upd timestamptz;
begin
  if not exists (select 1 from store_settings where counter_token = p_token) then
    raise exception 'token inválido';
  end if;
  select amount, event into v_goal, v_event from budget_daily where day = v_day and channel = 'tienda';
  select net, orders, updated_at into v_sold, v_orders, v_upd from sales_channel_daily where day = v_day and channel = 'tienda';
  select (ticket->>'tienda')::numeric into v_ticket from budget_settings where id = 1;
  select sum(amount), sum(amount) filter (where day <= v_day) into v_m_goal, v_m_goal_td
    from budget_daily where channel = 'tienda' and date_trunc('month', day) = date_trunc('month', v_day);
  select sum(net) into v_m_sold from sales_channel_daily
   where channel = 'tienda' and date_trunc('month', day) = date_trunc('month', v_day) and day <= v_day;
  return jsonb_build_object(
    'day', v_day, 'goal', v_goal, 'event', v_event,
    'sold', coalesce(v_sold, 0), 'orders', coalesce(v_orders, 0), 'ticket', v_ticket,
    'month_goal', v_m_goal, 'month_goal_to_date', v_m_goal_td, 'month_sold', coalesce(v_m_sold, 0),
    'updated_at', v_upd);
end $$;
revoke all on function public.store_get_goal(uuid, date) from public;
grant execute on function public.store_get_goal(uuid, date) to anon, authenticated;
