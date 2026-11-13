-- Activa Row Level Security (RLS) en todas las tablas de la aplicación.
--
-- Por qué: Supabase expone el esquema "public" por su API REST/GraphQL. Hoy los roles
-- "anon" y "authenticated" no tienen permisos sobre estas tablas, pero si alguien
-- concediera uno por error, RLS sin políticas sigue bloqueando todo el acceso por esa vía.
--
-- La aplicación NO se ve afectada: Prisma se conecta con el rol "postgres", dueño de las
-- tablas y con BYPASSRLS, así que RLS no le aplica. No se crean políticas a propósito:
-- ningún acceso directo desde el navegador está permitido.

ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Trabajador" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Area" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vehiculo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TurnoDiario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SnapshotTurno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
