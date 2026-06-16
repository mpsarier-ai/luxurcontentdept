-- LUXUR · Producción · LOTES con variantes de diseño
-- Tu proveedor produce por lote: toda la referencia junta hasta Lavandería,
-- y en Terminación se subdivide por diseño (Cruces Negras, Estrellas Negras, etc.)
--
-- Modelo:
--   production_batches (lote padre): nombre + qty total + etapas Corte→Lavandería
--   product_pipeline (variante hija): batch_id + design_name + qty + curva +
--                                      etapas Terminación + Entrega individuales
--
-- Corré esto UNA VEZ. Asume que ya corriste suppliers_upgrade.sql.

-- ─── 1. Tabla production_batches ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.production_batches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id         uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  name                text NOT NULL,           -- "Relaxed Fit DB0168"
  total_quantity      int,                     -- 320
  tentative_date      date,                    -- entrega tentativa
  has_proceso         boolean DEFAULT true,    -- false si no pasa por bordado/estampado
  batch_stage         text,                    -- corte | proceso | confeccion | lavanderia (NULL = corte en curso)
  batch_stage_history jsonb DEFAULT '[]'::jsonb,
  notes               text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team manage batches" ON public.production_batches;
CREATE POLICY "team manage batches" ON public.production_batches
  FOR ALL USING (public.is_team_member()) WITH CHECK (public.is_team_member());

CREATE INDEX IF NOT EXISTS idx_production_batches_supplier_id ON public.production_batches(supplier_id);

-- ─── 2. batch_id + design_name en product_pipeline ─────────────────────────
ALTER TABLE public.product_pipeline
  ADD COLUMN IF NOT EXISTS batch_id    uuid REFERENCES public.production_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS design_name text;

CREATE INDEX IF NOT EXISTS idx_product_pipeline_batch_id ON public.product_pipeline(batch_id);

-- Para las variantes en un lote, p.stage representa SOLO 'terminacion' o 'entrega'.
-- Las etapas tempranas vienen del batch. Si stage='terminacion' → terminación hecha,
-- entrega en curso. Si stage='entrega' → todo completo.

-- ─── 3. RPC actualizada: el proveedor obtiene lotes + standalone ───────────
CREATE OR REPLACE FUNCTION public.get_supplier_pipeline_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH s AS (SELECT id FROM suppliers WHERE token = p_token)
  SELECT jsonb_build_object(
    'supplier',    (SELECT to_jsonb(sup) FROM suppliers sup WHERE sup.token = p_token),
    'batches',     COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'batch',    to_jsonb(b),
        'variants', COALESCE((
          SELECT jsonb_agg(to_jsonb(v) ORDER BY v.position, v.design_name, v.product_name)
          FROM product_pipeline v WHERE v.batch_id = b.id
        ), '[]'::jsonb)
      ) ORDER BY b.tentative_date NULLS LAST, b.name)
      FROM production_batches b
      WHERE b.supplier_id = (SELECT id FROM s)
    ), '[]'::jsonb),
    'standalone',  COALESCE((
      SELECT jsonb_agg(to_jsonb(p) ORDER BY p.tentative_date NULLS LAST, p.product_name)
      FROM product_pipeline p
      WHERE p.supplier_id = (SELECT id FROM s)
        AND p.batch_id IS NULL
        AND COALESCE(p.status, 'pendiente') <> 'llego'
    ), '[]'::jsonb)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_supplier_pipeline_by_token(uuid) TO anon, authenticated;

-- ─── 4. RPC: avanzar etapa de un LOTE (solo etapas tempranas) ──────────────
CREATE OR REPLACE FUNCTION public.advance_batch_stage(p_token uuid, p_batch_id uuid, p_new_stage text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_id uuid;
  v_row public.production_batches%ROWTYPE;
  v_history jsonb;
  v_out jsonb;
BEGIN
  SELECT id INTO v_supplier_id FROM public.suppliers WHERE token = p_token;
  IF v_supplier_id IS NULL THEN RAISE EXCEPTION 'Token inválido'; END IF;
  SELECT * INTO v_row FROM public.production_batches
    WHERE id = p_batch_id AND supplier_id = v_supplier_id;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Lote no encontrado para este proveedor'; END IF;
  IF p_new_stage NOT IN ('corte','proceso','confeccion','lavanderia') THEN
    RAISE EXCEPTION 'Etapa inválida para lote: % (solo corte/proceso/confeccion/lavanderia)', p_new_stage;
  END IF;
  v_history := COALESCE(v_row.batch_stage_history, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object('stage', p_new_stage, 'at', now(), 'by', 'supplier')
  );
  UPDATE public.production_batches
  SET batch_stage = p_new_stage, batch_stage_history = v_history, updated_at = now()
  WHERE id = p_batch_id;
  SELECT to_jsonb(b) INTO v_out FROM public.production_batches b WHERE id = p_batch_id;
  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_batch_stage(uuid, uuid, text) TO anon, authenticated;

-- ─── 5. Verificación ──────────────────────────────────────────────────────
SELECT id, name, total_quantity, has_proceso, batch_stage FROM public.production_batches LIMIT 10;
SELECT id, product_name, design_name, batch_id, stage FROM public.product_pipeline LIMIT 20;
