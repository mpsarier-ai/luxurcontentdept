-- LUXUR · Plan de contenido · Semana Jun 23 Mar – Jun 29 Lun, 2026
-- 48 piezas: Nati (21) + Isabella (10) + Sofía (7) + Antonia (7) + (Isabella videos 8-9 → próxima semana)
--
-- Estructura:
--   Nati  = 1 Post + 2 Stories/día (baseline) — concepts específicos por día
--   Isabella = 1 Reel/día con referente URL en IG+TikTok (Video 1-7)
--           + 3 posts influencer (Mar/Jue/Sáb) + 3 stories influencer (Mié/Vie/Dom)
--   Sofía = 1 TikTok/día titulado "Video 1-7" (Paulina agrega URL después)
--   Antonia = 1 TikTok/día titulado "Video 1-7" (Paulina agrega URL después)
--
-- IMPORTANTE: corré esto UNA VEZ. Reemplaza completamente cualquier intento previo.

WITH
  cal AS (
    SELECT id FROM calendars
    WHERE start_date <= '2026-06-23' AND end_date >= '2026-06-29'
    ORDER BY start_date DESC LIMIT 1
  ),
  nati AS (
    SELECT email FROM team_members
    WHERE LOWER(name) LIKE '%nati%' OR LOWER(name) LIKE '%natasha%' LIMIT 1
  ),
  isabella AS (
    SELECT email FROM team_members
    WHERE LOWER(name) LIKE '%isabella%' OR LOWER(email) LIKE '%isabella%' LIMIT 1
  ),
  sofi AS (
    SELECT email FROM team_members
    WHERE LOWER(name) LIKE '%sof%' OR LOWER(email) LIKE '%sof%' LIMIT 1
  ),
  anto AS (
    SELECT email FROM team_members
    WHERE LOWER(name) LIKE '%anto%' OR LOWER(email) LIKE '%anto%' LIMIT 1
  )
INSERT INTO calendar_pieces
  (id, calendar_id, day, type, color, title, description, ref_url, assignee, status, platform, position, approved)
SELECT
  gen_random_uuid(), (SELECT id FROM cal), vals.day, vals.type, vals.color,
  vals.title, vals.description, NULLIF(vals.ref_url, ''),
  CASE vals.who
    WHEN 'nati' THEN (SELECT email FROM nati)
    WHEN 'isabella' THEN (SELECT email FROM isabella)
    WHEN 'sofi' THEN (SELECT email FROM sofi)
    WHEN 'anto' THEN (SELECT email FROM anto)
  END,
  'pendiente', vals.platform, vals.position, false
FROM (VALUES
  -- ═══ MAR 23 ════════════════════════════════════════════════════════
  ('Mar 23', 'Post', 'push', 'Unpopular opinion · jeans + flipflops > spring outfits',
   'Post con texto encima estilo statement. Referente: estética del reel adjunto, pero formato POST (no video) con texto overlay grande.',
   'https://www.instagram.com/reel/DWUkLcBEZbk/', 'nati', 'IG', 0),
  ('Mar 23', 'Stories', 'push', 'SWAG Brillos · el brillo discreto',
   'Stories del Brillos Swag Not Soul (59u parados). Ángulo "brillo elegante, no disco". Push del más estancado.',
   '', 'nati', 'IG', 1),
  ('Mar 23', 'Stories', 'launch', 'Teaser · algo azul viene Jueves',
   '1-2 stories muy sutiles. Grain blue o detalle de denim sin spoiler. Build-up del lanzamiento.',
   '', 'nati', 'IG', 2),
  ('Mar 23', 'Reel', 'push', 'Video 1',
   'Video Isabella IG + TikTok. Referente:',
   'https://www.instagram.com/reel/DZcd-piIbsL/?igsh=MTI0c3ozdWZ5b2xueQ==', 'isabella', 'Ambos', 3),
  ('Mar 23', 'Post', 'push', 'Post influencer #1',
   'Post con influencer (a definir). Distribuido en días de mayor tráfico de la semana.',
   '', 'isabella', 'IG', 4),
  ('Mar 23', 'TikTok', 'push', 'Video 1',
   'TikTok Sofía. Paulina agrega referente.',
   '', 'sofi', 'TikTok', 5),
  ('Mar 23', 'TikTok', 'push', 'Video 1',
   'TikTok Antonia. Paulina agrega referente.',
   '', 'anto', 'TikTok', 6),

  -- ═══ MIÉ 24 ════════════════════════════════════════════════════════
  ('Mié 24', 'Post', 'push', 'Estrellas Rosadas · estilo fondo del referente',
   'Mismo estilo y fondo del referente, pero con Pink Stars / Estrellas Rosadas. Higgsfield.',
   'https://www.instagram.com/p/DYNgRRtEe8C/', 'nati', 'IG', 0),
  ('Mié 24', 'Stories', 'launch', 'Countdown · MAÑANA 2 Destroyed Azules',
   '5-6 stories countdown. "12h", "8h", "4h". Preview AI de Destroyed Azul + Azul Claro.',
   '', 'nati', 'IG', 1),
  ('Mié 24', 'Stories', 'cross', 'Icon Estrellas Blancas complementario',
   '2-3 stories de Icon Estrellas Blancas. Refuerzo del catálogo.',
   '', 'nati', 'IG', 2),
  ('Mié 24', 'Reel', 'push', 'Video 2',
   'Video Isabella IG + TikTok. Referente:',
   'https://www.instagram.com/reel/DWVjY7ACqy2/?igsh=MTZxZGsxNWtoN3V4aw==', 'isabella', 'Ambos', 3),
  ('Mié 24', 'Stories', 'push', 'Story influencer #1',
   'Stories con influencer (a definir). En días sin post de influencer.',
   '', 'isabella', 'IG', 4),
  ('Mié 24', 'TikTok', 'push', 'Video 2',
   'TikTok Sofía. Paulina agrega referente.',
   '', 'sofi', 'TikTok', 5),
  ('Mié 24', 'TikTok', 'push', 'Video 2',
   'TikTok Antonia. Paulina agrega referente.',
   '', 'anto', 'TikTok', 6),

  -- ═══ JUE 25 · LANZAMIENTO Destroyed Azul + Azul Claro ══════════════
  ('Jue 25', 'Post', 'launch', 'LANZAMIENTO · Destroyed Azul Oscuro · fondo gris MP',
   'Post fondo gris estilo MP para el Destroyed Azul Oscuro lanzado HOY. Hero del feed.',
   '', 'nati', 'IG', 0),
  ('Jue 25', 'Stories', 'launch', 'Pre-launch · ya casi sale',
   '3-4 stories en la mañana — última cuenta regresiva antes del lanzamiento.',
   '', 'nati', 'IG', 1),
  ('Jue 25', 'Stories', 'launch', 'Ya salió · reacciones día completo',
   '5-7 stories durante el día post-lanzamiento. Reacciones del IG, primeras ventas, stock que se mueve.',
   '', 'nati', 'IG', 2),
  ('Jue 25', 'Reel', 'launch', 'Video 3',
   'Video Isabella IG + TikTok. Referente:',
   'https://www.instagram.com/reel/DZXKbpQMHpY/?igsh=MXhla2s2eWxwdW9kOQ==', 'isabella', 'Ambos', 3),
  ('Jue 25', 'Post', 'launch', 'Post influencer #2',
   'Post con influencer mostrando uno de los Destroyed Azules nuevos. Capitalizar el lanzamiento.',
   '', 'isabella', 'IG', 4),
  ('Jue 25', 'TikTok', 'launch', 'Video 3',
   'TikTok Sofía. Paulina agrega referente (idealmente algo del lanzamiento).',
   '', 'sofi', 'TikTok', 5),
  ('Jue 25', 'TikTok', 'launch', 'Video 3',
   'TikTok Antonia. Paulina agrega referente (idealmente algo del lanzamiento).',
   '', 'anto', 'TikTok', 6),

  -- ═══ VIE 26 ════════════════════════════════════════════════════════
  ('Vie 26', 'Post', 'push', 'Destroyed Crema · fondo gris MP',
   'Post fondo gris estilo MP para el Destroyed Crema. Continúa el flujo Destroyed de la semana.',
   '', 'nati', 'IG', 0),
  ('Vie 26', 'Stories', 'push', 'Push Crema + complementos',
   'Stories de cómo combinar el Crema con tops básicos. Cross-sell suave.',
   '', 'nati', 'IG', 1),
  ('Vie 26', 'Stories', 'cross', 'Combo Destroyed Azul nuevo + otro',
   'Stories de combos con el azul lanzado ayer + complementos del catálogo.',
   '', 'nati', 'IG', 2),
  ('Vie 26', 'Reel', 'push', 'Video 4',
   'Video Isabella IG + TikTok. Referente:',
   'https://www.instagram.com/reel/DYxPi0rNLvo/?igsh=NDh4NGRpeGE0ZnF2', 'isabella', 'Ambos', 3),
  ('Vie 26', 'Stories', 'push', 'Story influencer #2',
   'Stories con influencer (a definir).',
   '', 'isabella', 'IG', 4),
  ('Vie 26', 'TikTok', 'push', 'Video 4',
   'TikTok Sofía. Paulina agrega referente.',
   '', 'sofi', 'TikTok', 5),
  ('Vie 26', 'TikTok', 'push', 'Video 4',
   'TikTok Antonia. Paulina agrega referente.',
   '', 'anto', 'TikTok', 6),

  -- ═══ SÁB 27 ════════════════════════════════════════════════════════
  ('Sáb 27', 'Post', 'push', 'Post estático con jeans nuevos',
   'Post estático estilo del referente, con los jeans nuevos de la semana destacados.',
   'https://www.instagram.com/p/DXXcXvVEQgW/', 'nati', 'IG', 0),
  ('Sáb 27', 'Stories', 'push', 'Pink Stars Retro · rescate',
   '3-4 stories de Pink Stars Retro (42u parados, ST 39%). Rescate del quedado.',
   '', 'nati', 'IG', 1),
  ('Sáb 27', 'Stories', 'cross', 'Conversión finde',
   'Stories soft sell del fin de semana — outfit del día, "lista para el plan".',
   '', 'nati', 'IG', 2),
  ('Sáb 27', 'Reel', 'push', 'Video 5',
   'Video Isabella IG + TikTok. Referente:',
   'https://www.instagram.com/reel/DZEuooRhzhv/?igsh=ZWk1M3dmNTY4cXRt', 'isabella', 'Ambos', 3),
  ('Sáb 27', 'Post', 'push', 'Post influencer #3',
   'Post con influencer (a definir). Último de los 3 de la semana.',
   '', 'isabella', 'IG', 4),
  ('Sáb 27', 'TikTok', 'push', 'Video 5',
   'TikTok Sofía. Paulina agrega referente.',
   '', 'sofi', 'TikTok', 5),
  ('Sáb 27', 'TikTok', 'push', 'Video 5',
   'TikTok Antonia. Paulina agrega referente.',
   '', 'anto', 'TikTok', 6),

  -- ═══ DOM 28 ════════════════════════════════════════════════════════
  ('Dom 28', 'Post', 'push', 'Higgsfield · diferentes jeans + texto en español',
   'Post estilo del referente, con jeans Higgsfield variados y texto en español (traducir el original).',
   'https://www.instagram.com/p/DWHPcG7lj3r/', 'nati', 'IG', 0),
  ('Dom 28', 'Stories', 'recap', 'Recap visual del finde',
   'Stories de cierre del fin de semana — los hits de los últimos 3 días.',
   '', 'nati', 'IG', 1),
  ('Dom 28', 'Stories', 'recap', 'Mejor look de la semana',
   'Stories con el outfit destacado de la semana — votación / engagement.',
   '', 'nati', 'IG', 2),
  ('Dom 28', 'Reel', 'push', 'Video 6',
   'Video Isabella IG + TikTok. Referente:',
   'https://www.instagram.com/reel/DYwfbRoI0wL/?igsh=MWJuMjZoOXR0eWN4bw==', 'isabella', 'Ambos', 3),
  ('Dom 28', 'Stories', 'push', 'Story influencer #3',
   'Stories con influencer (a definir). Último de los 3 de la semana.',
   '', 'isabella', 'IG', 4),
  ('Dom 28', 'TikTok', 'push', 'Video 6',
   'TikTok Sofía. Paulina agrega referente.',
   '', 'sofi', 'TikTok', 5),
  ('Dom 28', 'TikTok', 'push', 'Video 6',
   'TikTok Antonia. Paulina agrega referente.',
   '', 'anto', 'TikTok', 6),

  -- ═══ LUN 29 ════════════════════════════════════════════════════════
  ('Lun 29', 'Post', 'push', 'Fluffy · cierre de semana',
   'Post del Fluffy Denim (30u parados, ST 33%) para cerrar la semana con el último de los quedados.',
   '', 'nati', 'IG', 0),
  ('Lun 29', 'Stories', 'preorden', 'Lista de espera · Black Stars + Cream Beige',
   'Stories de "lista de espera" para Black Stars (7u) y Cream Beige (2u). Capturar demanda antes que enfríe. CTA por DM.',
   '', 'nati', 'IG', 1),
  ('Lun 29', 'Stories', 'push', 'Blush Rosado · mantenimiento sutil',
   '1-2 stories de Blush para mantener el anchor vivo sin saturar (bajamos su frecuencia esta semana).',
   '', 'nati', 'IG', 2),
  ('Lun 29', 'Reel', 'push', 'Video 7',
   'Video Isabella IG + TikTok. Referente:',
   'https://www.instagram.com/reel/DXxoTpBPRn7/?igsh=Z3dycDVmMmNycXdi', 'isabella', 'Ambos', 3),
  ('Lun 29', 'TikTok', 'push', 'Video 7',
   'TikTok Sofía. Paulina agrega referente.',
   '', 'sofi', 'TikTok', 4),
  ('Lun 29', 'TikTok', 'push', 'Video 7',
   'TikTok Antonia. Paulina agrega referente.',
   '', 'anto', 'TikTok', 5)
) AS vals(day, type, color, title, description, ref_url, who, platform, position);

-- Verificación
SELECT day, type, title, assignee, platform, color
FROM calendar_pieces
WHERE calendar_id = (SELECT id FROM calendars WHERE start_date <= '2026-06-23' AND end_date >= '2026-06-29' ORDER BY start_date DESC LIMIT 1)
ORDER BY
  CASE day
    WHEN 'Mar 23' THEN 1 WHEN 'Mié 24' THEN 2 WHEN 'Jue 25' THEN 3
    WHEN 'Vie 26' THEN 4 WHEN 'Sáb 27' THEN 5 WHEN 'Dom 28' THEN 6 WHEN 'Lun 29' THEN 7
  END,
  position;

-- Recordatorio: Isabella videos 8 y 9 quedan para la próxima semana:
--   Video 8 · https://www.instagram.com/reel/DY2NG4mt6ao/?igsh=MWI4bW80M3FtM2VtYg==
--   Video 9 · https://www.instagram.com/reel/DZDLDrlPV24/?igsh=MWV2a3UzdngyZ3Z1dQ==
