-- LUXUR · Fix bounce-back de Sofía e Isabella
-- Causa común: emails en team_members con mayúsculas no matchean con el JWT
-- de Supabase auth (que siempre llega en minúsculas). El RLS dice "no estás
-- en la allowlist" → la app llama signOut → vuelven al login.

-- 1) DIAGNÓSTICO: ¿están sus emails registrados? ¿en qué caso?
SELECT email, name, role,
       CASE WHEN email = LOWER(email) THEN 'OK · minúsculas'
            ELSE '⚠️ tiene mayúsculas — revisar' END AS estado
FROM team_members
ORDER BY name;

-- 2) DIAGNÓSTICO: ¿la función is_team_member() existe? ¿qué hace?
SELECT pg_get_functiondef('public.is_team_member()'::regprocedure);

-- 3) FIX: normalizar todos los emails a minúsculas + trim espacios
UPDATE team_members
SET email = LOWER(TRIM(email))
WHERE email <> LOWER(TRIM(email));

-- 4) Verificar que ya quedaron todos en minúsculas
SELECT email, name, role FROM team_members
WHERE email <> LOWER(email);  -- debería devolver 0 filas

-- 5) Si Sofía o Isabella faltan, agregalas (ajustá los emails reales):
-- INSERT INTO team_members (email, name, role, focus) VALUES
--   ('sofia@gmail.com',     'Sofía',    'editor', 'TikTok / video'),
--   ('isabella@gmail.com',  'Isabella', 'editor', 'Contenido + UGC')
-- ON CONFLICT (email) DO NOTHING;

-- 6) Ver el equipo final completo
SELECT email, name, role, focus FROM team_members ORDER BY name;
