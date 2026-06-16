-- LUXUR · Producción · UN solo link para el proveedor (multi-producto)
-- Antes: cada jean tenía su propio supplier_token. Ahora: el proveedor tiene
-- un token; el link /s/{token} le muestra TODOS sus jeans en producción.
--
-- Corré esto UNA VEZ en el SQL Editor de Supabase.
-- Si NO corriste production_pipeline_upgrade.sql antes, corré ese PRIMERO.

-- ─── 1. Tabla suppliers ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suppliers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  token       uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  phone       text,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team manage suppliers" ON public.suppliers;
CREATE POLICY "team manage suppliers" ON public.suppliers
  FOR ALL USING (public.is_team_member()) WITH CHECK (public.is_team_member());

-- ─── 2. supplier_id en product_pipeline ────────────────────────────────────
ALTER TABLE public.product_pipeline
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_pipeline_supplier_id ON public.product_pipeline(supplier_id);

-- ─── 3. Proveedor por defecto + backfill ──────────────────────────────────
-- Si no hay ningún proveedor, creá uno default. Si la tabla ya tiene filas,
-- no toca nada.
INSERT INTO public.suppliers (name)
SELECT 'Proveedor LUXUR'
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers);

-- Asigná todas las entradas del pipeline al primer proveedor (si no tienen ya uno)
UPDATE public.product_pipeline
SET supplier_id = (SELECT id FROM public.suppliers ORDER BY created_at LIMIT 1)
WHERE supplier_id IS NULL;

-- ─── 4. RPC público: el proveedor obtiene TODOS sus productos en curso ────
CREATE OR REPLACE FUNCTION public.get_supplier_pipeline_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'supplier', (SELECT to_jsonb(s) FROM suppliers s WHERE s.token = p_token),
    'items',    COALESCE((
      SELECT jsonb_agg(to_jsonb(p) ORDER BY p.tentative_date NULLS LAST, p.product_name)
      FROM product_pipeline p
      WHERE p.supplier_id = (SELECT id FROM suppliers WHERE token = p_token)
        AND COALESCE(p.status, 'pendiente') <> 'llego'
    ), '[]'::jsonb)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_supplier_pipeline_by_token(uuid) TO anon, authenticated;

-- ─── 5. RPC público: avanzar etapa de UN producto específico ──────────────
-- Recibe el token del proveedor + el id del producto. Valida que el producto
-- realmente pertenezca a ese proveedor.
CREATE OR REPLACE FUNCTION public.advance_supplier_stage(p_token uuid, p_pipeline_id uuid, p_new_stage text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_id uuid;
  v_row public.product_pipeline%ROWTYPE;
  v_history jsonb;
  v_out jsonb;
BEGIN
  SELECT id INTO v_supplier_id FROM public.suppliers WHERE token = p_token;
  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;
  SELECT * INTO v_row FROM public.product_pipeline
    WHERE id = p_pipeline_id AND supplier_id = v_supplier_id;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado para este proveedor';
  END IF;
  IF p_new_stage NOT IN ('corte','proceso','confeccion','lavanderia','terminacion','entrega') THEN
    RAISE EXCEPTION 'Etapa inválida: %', p_new_stage;
  END IF;
  v_history := COALESCE(v_row.stage_history, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object('stage', p_new_stage, 'at', now(), 'by', 'supplier')
  );
  UPDATE public.product_pipeline
  SET stage = p_new_stage, stage_history = v_history
  WHERE id = p_pipeline_id;
  SELECT to_jsonb(p) INTO v_out FROM public.product_pipeline p WHERE id = p_pipeline_id;
  RETURN v_out;
END;
$$;
GRANT EXECUTE ON FUNCTION public.advance_supplier_stage(uuid, uuid, text) TO anon, authenticated;

-- ─── 6. Verificación ──────────────────────────────────────────────────────
SELECT id, name, token FROM public.suppliers;
SELECT id, product_name, supplier_id, stage, has_proceso FROM public.product_pipeline LIMIT 20;
