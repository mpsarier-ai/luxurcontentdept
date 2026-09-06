-- LUXUR Ops · setup de notificaciones por email
-- Marca a Paulina como "lead" (recibe notificaciones de "lista para aprobar")
-- Si querés que Isabella también apruebe, descomentá su línea.

-- Asegura que la columna role permite 'lead' / 'admin'
update team_members set role = 'lead' where email in (
  'mpsarier@gmail.com'
  -- , 'isabellasalazara13@gmail.com'  -- descomentá si Isabella también aprueba
);

-- Verificar que quedó OK
select email, name, role from team_members where role in ('lead','admin');
