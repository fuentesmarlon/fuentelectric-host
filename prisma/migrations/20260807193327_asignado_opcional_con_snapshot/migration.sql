-- DropForeignKey
ALTER TABLE "TurnoDiario" DROP CONSTRAINT "TurnoDiario_asignadoId_fkey";

-- AlterTable
ALTER TABLE "TurnoDiario" ADD COLUMN     "asignadoNombre" TEXT,
ALTER COLUMN "asignadoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "TurnoDiario" ADD CONSTRAINT "TurnoDiario_asignadoId_fkey" FOREIGN KEY ("asignadoId") REFERENCES "Trabajador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
