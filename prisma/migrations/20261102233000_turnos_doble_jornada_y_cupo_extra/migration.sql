-- AlterEnum
ALTER TYPE "HorarioBase" ADD VALUE IF NOT EXISTS 'NOCTURNO_21_09';

-- DropIndex
DROP INDEX IF EXISTS "TurnoDiario_asignadoId_fecha_key";

-- AlterTable
ALTER TABLE "TurnoDiario" ADD COLUMN IF NOT EXISTS "esCupoExtra" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "TurnoDiario_asignadoId_fecha_tipoTurno_key" ON "TurnoDiario"("asignadoId", "fecha", "tipoTurno");

