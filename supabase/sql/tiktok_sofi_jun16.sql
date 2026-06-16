-- LUXUR · 6 TikToks Sofía · Semana Jun 16 Mar – Jun 22 Lun, 2026
-- Inserta 6 piezas tipo TikTok asignadas a Sofía en el calendario de esta semana.
-- IMPORTANTE: corrê esto UNA SOLA VEZ. Si lo corres dos veces verás duplicados.

WITH
  cal AS (
    SELECT id FROM calendars
    WHERE start_date <= '2026-06-16' AND end_date >= '2026-06-22'
    ORDER BY start_date DESC
    LIMIT 1
  ),
  sofi AS (
    SELECT email FROM team_members
    WHERE LOWER(name) LIKE 'sof%' OR LOWER(email) LIKE 'sof%'
    LIMIT 1
  )
INSERT INTO calendar_pieces
  (id, calendar_id, day, type, color, title, description, ref_url, assignee, status, platform, position, approved)
SELECT
  gen_random_uuid(),
  (SELECT id FROM cal),
  vals.day,
  'TikTok',
  'push',
  vals.title,
  vals.description,
  vals.ref_url,
  (SELECT email FROM sofi),
  'pendiente',
  'TikTok',
  vals.position,
  false
FROM (VALUES
  ('Mar 16', '"Mira estos jeans tan wow"',
   'Hook discovery puro. Foco: Blush Rosado, Carpenter, Wide Leg Dirty.',
   'https://www.instagram.com/reel/DXVN3xVCQI1/?igsh=MTV5MHBmeDN5eWQwZw==', 0),

  ('Mié 17', 'Comparando 6 fits LUXUR',
   'Side-by-side: Wide Leg, Straight, Skinny, Flare, Relaxed, Carpenter.',
   'https://vt.tiktok.com/ZSQbfUeAY/', 0),

  ('Jue 18', 'Guía rápida cómo combinar jeans',
   'Tip styling: 3 looks por fit. Cross-sell tank tops.',
   'https://www.instagram.com/reel/DVzbwA_AsPZ/?igsh=MWhsNHNxZmJybnV4Mw==', 0),

  ('Vie 19', 'Colección Destroyed completa',
   'Mismo hook que el referente. Showcase: Negro, Azul, Azul Claro, Arena.',
   'https://www.instagram.com/reel/DYr6-HShVPP/?igsh=MWhtMDMzbHZpNWM3dg==', 0),

  ('Sáb 20', 'Hay una cosa en la que soy buena · Flare',
   'Hook personal "encontrar jeans que jeanean" aplicado al Flare Ice Wash.',
   'https://www.instagram.com/reel/DGlzZDUStHD/?igsh=MTVxcXlxOG95NG05NA==', 0),

  ('Lun 22', 'Podemos hablar sobre mis jeans · Relaxed',
   'Hook personal aplicado al Relaxed Fit de LUXUR.',
   'https://www.instagram.com/reel/DSbQq8bEV9n/?igsh=MjEyMXlrN2k5cTI0', 0)
) AS vals(day, title, description, ref_url, position);

-- Verificación · debería devolver 6 filas
SELECT day, title, type, assignee, platform, status
FROM calendar_pieces
WHERE assignee = (SELECT email FROM team_members WHERE LOWER(name) LIKE 'sof%' LIMIT 1)
  AND calendar_id = (
    SELECT id FROM calendars
    WHERE start_date <= '2026-06-16' AND end_date >= '2026-06-22'
    ORDER BY start_date DESC LIMIT 1
  )
ORDER BY position, day;
