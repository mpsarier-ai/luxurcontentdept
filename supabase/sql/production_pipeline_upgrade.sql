-- LUXUR · Producción · pipeline de 6 etapas con acceso público del proveedor
-- Corré esto UNA VEZ en el SQL Editor de Supabase.
--
-- Semántica:
--   stage = NULL                 → nada hecho aún, "Corte" está en curso (current)
--   stage = 'corte'              → Corte hecho, "Proceso" en curso
--   stage = 'proceso'            → Proceso hecho, "Confección" en curso
--   stage = 'confeccion'         → Confección hecha, "Lavandería" en curso
--   stage = 'lavanderia'         → Lavandería hecha, "Terminación" en curso
--   stage = 'terminacion'        → Terminación hecha, "Entrega" en curso
--   stage = 'entrega'            → ✓ TODO COMPLETO, jean entregado
--
-- Si has_proceso = false → la etapa "Proceso" se salta (jean básico sin bordado/estampado)

-- ─── 1. Columnas nuevas en product_pipeline ────────────────────────────────
ALTER TABLE public.product_pipeline
  ADD COLUMN IF NOT EXISTS stage text,
  ADD COLUMN IF NOT EXISTS quantity integer,
  ADD COLUMN IF NOT EXISTS size_curve jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS stage_history jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS supplier_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS has_proceso boolean DEFAULT true;

-- Garantiza que toda fila exista con token (filas viejas)
UPDATE public.product_pipeline SET supplier_token = gen_random_uuid() WHERE supplier_token IS NULL;

-- Index para lookup rápido por token
CREATE INDEX IF NOT EXISTS idx_product_pipeline_supplier_token ON public.product_pipeline(supplier_token);

-- ─── 2. RPC público: obtener una entrada por token ─────────────────────────
CREATE OR REPLACE FUNCTION public.get_pipeline_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(p) FROM product_pipeline p WHERE p.supplier_token = p_token;
$$;

GRANT EXECUTE ON FUNCTION public.get_pipeline_by_token(uuid) TO anon, authenticated;

-- ─── 3. RPC público: marcar etapa como completada ──────────────────────────
-- El proveedor marca la etapa actual como terminada → stage = esa etapa
-- (semántica = "última etapa completada"). El stepper en el front lo interpreta.
CREATE OR REPLACE FUNCTION public.advance_stage_by_token(p_token uuid, p_new_stage text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.product_pipeline%ROWTYPE;
  v_history jsonb;
  v_out jsonb;
BEGIN
  SELECT * INTO v_row FROM public.product_pipeline WHERE supplier_token = p_token;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;
  IF p_new_stage NOT IN ('corte','proceso','confeccion','lavanderia','terminacion','entrega') THEN
    RAISE EXCEPTION 'Etapa inválida: %', p_new_stage;
  END IF;
  v_history := COALESCE(v_row.stage_history, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object('stage', p_new_stage, 'at', now(), 'by', 'supplier')
  );
  UPDATE public.product_pipeline
  SET stage = p_new_stage, stage_history = v_history
  WHERE supplier_token = p_token;
  SELECT to_jsonb(p) INTO v_out FROM public.product_pipeline p WHERE supplier_token = p_token;
  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_stage_by_token(uuid, text) TO anon, authenticated;

-- ─── 4. Verificar ──────────────────────────────────────────────────────────
SELECT id, product_name, stage, quantity, size_curve, has_proceso, supplier_token
FROM public.product_pipeline
ORDER BY tentative_date NULLS LAST
LIMIT 20;
