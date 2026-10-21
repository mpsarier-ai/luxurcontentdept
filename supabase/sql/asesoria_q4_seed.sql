-- ═══ ASESORÍA Q4 · datos iniciales (aplicado el 21-oct-2026) ═══
-- Fuente: PRESUPUESTO_NOV-DIC_LUXUR.xlsx (Juliana) y LUXUR Necesidad producto Q4.xlsx (María, 14-oct).
-- Verificado: nov 210 M (74,1 / 123,4 / 12,5), dic 420 M, 27-nov tienda $5.318.500.

-- Supuestos (factores por día lun..dom de Juliana; ticket real de septiembre 2026)
insert into public.budget_settings (id,dow_factors,ticket,ticket_source,th_on_target,th_attention,th_pace_max,ss_weeks,discount_obsolete,jan_mult)
values (1,'{"tienda":[0.7,0.8,0.88,0.8,1.2,1.82,0.8],"online":[0.92,1.06,1.03,0.89,1.02,1.03,1.05],"whatsapp":[1.04,0.85,1.14,1.39,1.29,0.8,0.49]}'::jsonb,
  '{"tienda":235970,"online":191461,"whatsapp":199791}'::jsonb,'Shopify, septiembre 2026 (Juliana usa $250.000 de ejemplo)',1.0,0.9,1.1,8,true,1)
on conflict (id) do update set dow_factors=excluded.dow_factors,ticket=excluded.ticket,ticket_source=excluded.ticket_source,updated_at=now();

-- Octubre: presupuesto del mes por canal (hoja de María) repartido con los factores de Juliana, sin eventos
with s as (select dow_factors f from budget_settings where id=1),
mb(channel, amt) as (values ('tienda',51600000),('online',43000000),('whatsapp',6000000)),
d as (select g::date as dd from generate_series('2026-10-01'::date,'2026-10-31'::date,'1 day'::interval) g),
w as (select d.dd, mb.channel, mb.amt, ((select f from s)->mb.channel->>((extract(isodow from d.dd)::int)-1))::numeric wt from d cross join mb)
insert into budget_daily (day,channel,amount,event,mult,source)
select dd, channel, round(amt*wt/sum(wt) over (partition by channel),2), null, 1, 'octubre: factores de Juliana' from w
on conflict (day,channel) do update set amount=excluded.amount, source=excluded.source;

-- Noviembre y diciembre: regla J2 de Juliana = ppto_mes × factor_día × multiplicador / suma del mes
-- (la lista completa de eventos y multiplicadores por canal está en la hoja de Juliana; se cargó con
--  values (fecha, evento, mult_tienda, mult_online, mult_whatsapp) para los 61 días)

-- Plan de María (versión vigente)
insert into public.demand_plan (version,is_current,category,budget,share,net_price,sold_before,cutoff,stock_active,stock_obsolete,unit_cost,prev_need,window_label,oct_days_left,notes,created_by) values
('María · 14 oct 2026',true,'jeans','{"oct":100500000,"nov":210000000,"dic":420000000}'::jsonb,0.9036837816338799,168933.84706379383,32595495.57,'2026-10-13',1000,245,79176,'[658,627,1740]'::jsonb,'jun–sep 2026',18,'LUXUR Necesidad producto Q4.xlsx · obsoleto marcado a mano por referencia','María Alejandra Moná'),
('María · 14 oct 2026',true,'tank_tops','{"oct":100500000,"nov":210000000,"dic":420000000}'::jsonb,0.07866908457824912,66558.08986615679,1740941.24,'2026-10-13',275,82,25889,'[120,138,385]'::jsonb,'jun–sep 2026',18,'LUXUR Necesidad producto Q4.xlsx · solo productos con TANK TOP en el nombre','María Alejandra Moná');

-- Venta por canal: refresh-channels cada hora (backfill inicial de 120 días con {"days":120})
select cron.schedule('refresh-channels-hourly', '5 * * * *',
  $$select net.http_post(url := 'https://nrpgtlcdvtesjbxpkxha.supabase.co/functions/v1/refresh-channels',
    headers := jsonb_build_object('Content-Type','application/json'), body := '{"days":3}'::jsonb, timeout_milliseconds := 60000)$$);
