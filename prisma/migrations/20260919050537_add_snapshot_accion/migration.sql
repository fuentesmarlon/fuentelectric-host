-- CreateEnum
CREATE TYPE "AccionSnapshot" AS ENUM ('CREACION', 'EDICION', 'ELIMINACION');

-- AlterTable
ALTER TABLE "SnapshotTurno" ADD COLUMN     "accion" "AccionSnapshot" NOT NULL DEFAULT 'CREACION';
