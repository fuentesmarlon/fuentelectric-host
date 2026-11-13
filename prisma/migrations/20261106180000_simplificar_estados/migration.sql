-- Quita estados que ya no se usan:
--   Trabajador: Descanso (se usa Vacaciones).
--   Vehículo:   SINIESTRADO, BORRADOR e INACTIVO (la baja se hace con el botón Eliminar).
--
-- Si algún registro todavía tiene uno de esos estados, primero se pasa a su equivalente:
--   Descanso    -> Vacaciones
--   SINIESTRADO -> EN_TALLER     (detenido por reparación)
--   BORRADOR    -> DISPONIBLE
--   INACTIVO    -> DADO_DE_BAJA  (lo mismo que hace el botón Eliminar; libera a sus trabajadores)
--
-- Todo va en una transacción: si algo falla, no se aplica nada.

BEGIN;

-- 1. Reubicar los registros que tengan estados que se van a quitar
UPDATE "Trabajador" SET "disponibilidad" = 'Vacaciones' WHERE "disponibilidad" = 'Descanso';

UPDATE "Vehiculo" SET "estado" = 'EN_TALLER' WHERE "estado" = 'SINIESTRADO';
UPDATE "Vehiculo" SET "estado" = 'DISPONIBLE' WHERE "estado" = 'BORRADOR';
UPDATE "Trabajador" SET "vehiculoId" = NULL
WHERE "vehiculoId" IN (SELECT "id" FROM "Vehiculo" WHERE "estado" = 'INACTIVO');
UPDATE "Vehiculo" SET "estado" = 'DADO_DE_BAJA' WHERE "estado" = 'INACTIVO';

-- 2. EstadoTrabajador sin 'Descanso'
ALTER TYPE "EstadoTrabajador" RENAME TO "EstadoTrabajador_old";
CREATE TYPE "EstadoTrabajador" AS ENUM ('Activo', 'Incapacidad', 'Vacaciones', 'Inactivo');
ALTER TABLE "Trabajador" ALTER COLUMN "disponibilidad" DROP DEFAULT;
ALTER TABLE "Trabajador" ALTER COLUMN "disponibilidad" TYPE "EstadoTrabajador" USING ("disponibilidad"::text::"EstadoTrabajador");
ALTER TABLE "Trabajador" ALTER COLUMN "disponibilidad" SET DEFAULT 'Activo';
DROP TYPE "EstadoTrabajador_old";

-- 3. EstadoVehiculo sin 'SINIESTRADO', 'BORRADOR' ni 'INACTIVO'
ALTER TYPE "EstadoVehiculo" RENAME TO "EstadoVehiculo_old";
CREATE TYPE "EstadoVehiculo" AS ENUM ('DISPONIBLE', 'EN_TALLER', 'EN_INSPECCION', 'VENDIDO', 'DADO_DE_BAJA');
ALTER TABLE "Vehiculo" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Vehiculo" ALTER COLUMN "estado" TYPE "EstadoVehiculo" USING ("estado"::text::"EstadoVehiculo");
ALTER TABLE "Vehiculo" ALTER COLUMN "estado" SET DEFAULT 'DISPONIBLE';
DROP TYPE "EstadoVehiculo_old";

COMMIT;
