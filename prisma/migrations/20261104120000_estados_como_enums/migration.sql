-- Convierte los estados de Trabajador, Vehiculo y Area de TEXT libre a enums.
-- Los valores del enum son idénticos a los textos que ya usa la aplicación,
-- así que los datos existentes no cambian.
--
-- Todo va en una transacción: si algún valor no se puede convertir, no se aplica nada.

BEGIN;

-- CreateEnum
CREATE TYPE "EstadoTrabajador" AS ENUM ('Activo', 'Descanso', 'Incapacidad', 'Vacaciones', 'Inactivo');

-- CreateEnum
CREATE TYPE "EstadoVehiculo" AS ENUM ('DISPONIBLE', 'EN_TALLER', 'EN_INSPECCION', 'SINIESTRADO', 'BORRADOR', 'INACTIVO', 'VENDIDO', 'DADO_DE_BAJA');

-- CreateEnum
CREATE TYPE "EstadoArea" AS ENUM ('Activo', 'Inactivo');

-- Normalización defensiva: corrige diferencias de mayúsculas/espacios
-- (p. ej. ' activo' -> 'Activo') antes de convertir.
UPDATE "Trabajador" t
SET "disponibilidad" = e.valor
FROM unnest(enum_range(NULL::"EstadoTrabajador")::text[]) AS e(valor)
WHERE lower(trim(t."disponibilidad")) = lower(e.valor) AND t."disponibilidad" <> e.valor;

UPDATE "Vehiculo" v
SET "estado" = e.valor
FROM unnest(enum_range(NULL::"EstadoVehiculo")::text[]) AS e(valor)
WHERE upper(replace(trim(v."estado"), ' ', '_')) = e.valor AND v."estado" <> e.valor;

UPDATE "Area" a
SET "estado" = e.valor
FROM unnest(enum_range(NULL::"EstadoArea")::text[]) AS e(valor)
WHERE lower(trim(a."estado")) = lower(e.valor) AND a."estado" <> e.valor;

-- AlterTable: Trabajador.disponibilidad
ALTER TABLE "Trabajador" ALTER COLUMN "disponibilidad" DROP DEFAULT;
ALTER TABLE "Trabajador" ALTER COLUMN "disponibilidad" TYPE "EstadoTrabajador" USING ("disponibilidad"::"EstadoTrabajador");
ALTER TABLE "Trabajador" ALTER COLUMN "disponibilidad" SET DEFAULT 'Activo';

-- AlterTable: Vehiculo.estado
ALTER TABLE "Vehiculo" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Vehiculo" ALTER COLUMN "estado" TYPE "EstadoVehiculo" USING ("estado"::"EstadoVehiculo");
ALTER TABLE "Vehiculo" ALTER COLUMN "estado" SET DEFAULT 'DISPONIBLE';

-- AlterTable: Area.estado
ALTER TABLE "Area" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Area" ALTER COLUMN "estado" TYPE "EstadoArea" USING ("estado"::"EstadoArea");
ALTER TABLE "Area" ALTER COLUMN "estado" SET DEFAULT 'Activo';

COMMIT;
