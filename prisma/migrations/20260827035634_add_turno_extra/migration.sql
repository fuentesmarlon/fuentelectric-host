-- AlterTable
ALTER TABLE "SnapshotTurno" ADD COLUMN     "esTurnoExtra" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TurnoDiario" ADD COLUMN     "esTurnoExtra" BOOLEAN NOT NULL DEFAULT false;
