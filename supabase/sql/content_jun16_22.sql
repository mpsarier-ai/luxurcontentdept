-- LUXUR · Plan de contenido · Semana Jun 16 Mar – Jun 22 Lun, 2026
-- 23 piezas distribuidas entre Nati (16) e Isabella (7)
-- Hero: Blush Rosado · Lanzamiento Sábado: Destroyed Azul + Azul Claro + Low Wide Café Washed
-- IMPORTANTE: corré esto UNA VEZ. Duplicaría las piezas si se corre dos veces.

WITH
  cal AS (
    SELECT id FROM calendars
    WHERE start_date <= '2026-06-16' AND end_date >= '2026-06-22'
    ORDER BY start_date DESC LIMIT 1
  ),
  nati AS (
    SELECT email FROM team_members
    WHERE LOWER(name) LIKE '%nati%' OR LOWER(name) LIKE '%natasha%'
    LIMIT 1
  ),
  isabella AS (
    SELECT email FROM team_members
    WHERE LOWER(name) LIKE '%isabella%' OR LOWER(email) LIKE '%isabella%'
    LIMIT 1
  )
INSERT INTO calendar_pieces
  (id, calendar_id, day, type, color, title, description, assignee, status, platform, position, approved)
SELECT
  gen_random_uuid(),
  (SELECT id FROM cal),
  vals.day, vals.type, vals.color, vals.title, vals.description,
  CASE WHEN vals.who = 'nati' THEN (SELECT email FROM nati) ELSE (SELECT email FROM isabella) END,
  'pendiente', 'IG', vals.position, false
FROM (VALUES
  -- ─── MAR 16 ─────────────────────────────────────────────────────────
  ('Mar 16', 'Post', 'push', 'Blush Rosado · outfit hero',
   'AI carrusel · 4-5 slides. Combinaciones del Blush (top blanco, beige cropped, denim sobre denim). Foco en color y stock sano (64u).', 'nati', 0),
  ('Mar 16', 'Reel', 'push', 'Blush lifestyle real · exteriores',
   'Isabella graba caminata corta con Blush Rosado en luz natural. Muestra movimiento del jean. Cierre "¿ya tienes el tuyo?"', 'isabella', 1),
  ('Mar 16', 'Stories', 'push', 'Red Riders push',
   '3-4 stories de Red Riders (35 vendidos, 25 stock). Tip: "el rojo del momento" + swipe up a producto.', 'nati', 2),

  -- ─── MIÉ 17 ────────────────────────────────────────────────────────
  ('Mié 17', 'Post', 'push', 'Red Riders · carrusel hero',
   'AI carrusel 5 slides. Red Riders combinado con tops blancos, negros y prints. Hero del día para empujar stock.', 'nati', 0),
  ('Mié 17', 'Reel', 'push', 'Cómo combinar Blush Rosado',
   'AI reel · transiciones de 4-5 looks distintos con el Blush. CTA al final: "¿cuál te gusta más?"', 'nati', 1),
  ('Mié 17', 'Stories', 'launch', 'Countdown · Sábado sale Destroyed Azul + Café Washed',
   '4 stories · cuenta regresiva "3 días", "2 días" próximamente. Generar hype con preview AI de los nuevos.', 'nati', 2),
  ('Mié 17', 'Reel', 'cross', 'UGC Pink Stars Retro · rescate',
   'Isabella sesión real con Pink Stars Retro (42 stock, ST 39%). Estilo UGC, casual, ángulo "el jean que faltaba". Bajar a mid-tier creator si hay.', 'isabella', 3),
  ('Mié 17', 'Stories', 'cross', 'Detrás de cámara · Fluffy Denim',
   'Isabella stories rápidas de sesión con Fluffy Denim (30 stock parado). Estilo detrás-de-escena para humanizar y mover stock.', 'isabella', 4),

  -- ─── JUE 18 ────────────────────────────────────────────────────────
  ('Jue 18', 'Post', 'push', 'Deserve Less Azul Claro · hero',
   'AI carrusel del Deserve Less Azul Claro (34 vend, 19 stock). Posicionarlo como "el azul claro del verano". Push secundario.', 'nati', 0),
  ('Jue 18', 'Stories', 'preorden', 'Lista de espera · Black Stars + Cream Beige',
   '3-4 stories: "Se está agotando" Black Stars (7u) + Cream Beige (2u). CTA "regístrate para restock" o DM. Aprovechar el FOMO antes que se enfríe.', 'nati', 1),
  ('Jue 18', 'Reel', 'cross', 'Sesión Icon Estrellas Blancas + Fluffy',
   'Isabella reel real combinando Icon Estrellas Blancas (34 stock, ST 48%) con Fluffy. Mostrar lifestyle. Foco en rescate de stock estancado.', 'isabella', 2),

  -- ─── VIE 19 ────────────────────────────────────────────────────────
  ('Vie 19', 'Post', 'push', 'Blush Rosado · hero principal',
   'AI carrusel hero del Blush. Continuar pauta principal — el de stock sano sigue siendo el caballo de batalla.', 'nati', 0),
  ('Vie 19', 'Reel', 'launch', 'Teaser · Mañana sale Destroyed Azul + Café Washed',
   'AI reel teaser con previews del Destroyed Azul + Azul Claro + Low Wide Café Washed. "Mañana 12pm". Generar hype.', 'nati', 1),
  ('Vie 19', 'Stories', 'launch', 'Countdown final intenso',
   '5-6 stories durante el día: "12 horas", "8 horas", "4 horas". Last call para los que vienen siguiendo desde Mié.', 'nati', 2),

  -- ─── SÁB 20 · LANZAMIENTO ──────────────────────────────────────────
  ('Sáb 20', 'Post', 'launch', 'LANZAMIENTO · Destroyed Azul + Azul Claro + Low Wide Café Washed',
   'AI carrusel del lanzamiento. 1 slide por modelo + 1 slide de los 3 juntos. Destacar tirita ajustable del Low Wide.', 'nati', 0),
  ('Sáb 20', 'Reel', 'launch', 'Showcase · 3 lanzamientos AI',
   'AI reel con transiciones de los 3 nuevos modelos. Música punchy. Posicionar como evento del finde.', 'nati', 1),
  ('Sáb 20', 'Reel', 'launch', 'Unboxing real · Destroyed Azul + Café Washed',
   'Isabella graba unboxing real de los nuevos. Mostrar textura, tirita ajustable de Café Washed, reacción genuina. Cierra con CTA compra.', 'isabella', 2),
  ('Sáb 20', 'Stories', 'launch', 'Ya salió · todo el día',
   '6-8 stories durante el día: "Ya salió", reacciones del IG, primeras ventas, stock que se mueve. Mantener buzz.', 'nati', 3),
  ('Sáb 20', 'Stories', 'launch', 'Reacciones lifestyle weekend',
   'Isabella stories reaccionando al lanzamiento, modelando los 3, vibe weekend. Real y crudo.', 'isabella', 4),

  -- ─── DOM 21 · ride post-launch ─────────────────────────────────────
  ('Dom 21', 'Post', 'push', 'Café Washed outfit · tirita destacada',
   'AI carrusel zoom en la tirita ajustable del Low Wide Café Washed. Diferenciador clave del producto.', 'nati', 0),
  ('Dom 21', 'Reel', 'push', 'Isabella styling · Destroyed Azul día completo',
   'Isabella reel "un día con mi Destroyed Azul". Looks de día, snack, cena. Real, GRWM style.', 'isabella', 1),

  -- ─── LUN 22 · cierre ───────────────────────────────────────────────
  ('Lun 22', 'Post', 'recap', 'Recap · lo nuevo de esta semana',
   'AI carrusel recap: los 3 lanzamientos + Blush hero + Red Riders. Cierra la semana con la línea completa que se movió.', 'nati', 0),
  ('Lun 22', 'Stories', 'push', 'Blush Rosado · mantenimiento hero',
   '3-4 stories de Blush para seguir alimentando la pauta hero. Combinaciones distintas a las de Mar.', 'nati', 1)
) AS vals(day, type, color, title, description, who, position);

-- Verificación
SELECT day, type, title, assignee, color
FROM calendar_pieces
WHERE calendar_id = (SELECT id FROM calendars WHERE start_date <= '2026-06-16' AND end_date >= '2026-06-22' ORDER BY start_date DESC LIMIT 1)
  AND assignee IN (
    (SELECT email FROM team_members WHERE LOWER(name) LIKE '%nati%' OR LOWER(name) LIKE '%natasha%' LIMIT 1),
    (SELECT email FROM team_members WHERE LOWER(name) LIKE '%isabella%' OR LOWER(email) LIKE '%isabella%' LIMIT 1)
  )
ORDER BY
  CASE day
    WHEN 'Mar 16' THEN 1 WHEN 'Mié 17' THEN 2 WHEN 'Jue 18' THEN 3
    WHEN 'Vie 19' THEN 4 WHEN 'Sáb 20' THEN 5 WHEN 'Dom 21' THEN 6 WHEN 'Lun 22' THEN 7
  END,
  position;
