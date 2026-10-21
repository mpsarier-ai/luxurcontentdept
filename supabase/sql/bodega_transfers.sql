-- ═══ Bodega · traslados casa → tienda con confirmación de recepción ═══
-- Un traslado sale de la casa como "en camino"; en la tienda abren la caja,
-- cuentan y confirman. Si lo contado no coincide, queda "con_diferencia" y
-- lo contado en received_lines. Los bodega_moves (casa → tienda) se siguen
-- creando al enviar; la confirmación solo cierra el traslado.
create table if not exists public.bodega_transfers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by text,
  lines jsonb not null,                 -- [{product_gid, product_title, size, qty}]
  status text not null default 'en_camino' check (status in ('en_camino','recibido','con_diferencia')),
  received_at timestamptz,
  received_by text,
  received_lines jsonb,                 -- lo que contaron en la tienda
  note text
);
alter table public.bodega_transfers enable row level security;
create policy bodega_transfers_team on public.bodega_transfers
  for all to authenticated using (public.is_team_member()) with check (public.is_team_member());
