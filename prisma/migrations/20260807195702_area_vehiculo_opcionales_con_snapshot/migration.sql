-- DropForeignKey
ALTER TABLE "TurnoDiario" DROP CONSTRAINT "TurnoDiario_areaId_fkey";

-- DropForeignKey
ALTER TABLE "TurnoDiario" DROP CONSTRAINT "TurnoDiario_vehiculoId_fkey";

-- AlterTable
ALTER TABLE "TurnoDiario" ADD COLUMN     "areaNombre" TEXT,
ADD COLUMN     "vehiculoCodigo" TEXT,
ALTER COLUMN "areaId" DROP NOT NULL,
ALTER COLUMN "vehiculoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "TurnoDiario" ADD CONSTRAINT "TurnoDiario_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnoDiario" ADD CONSTRAINT "TurnoDiario_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
