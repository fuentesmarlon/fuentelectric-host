/*
  Warnings:

  - Added the required column `registradoPor` to the `TurnoDiario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TurnoDiario" ADD COLUMN     "registradoPor" TEXT NOT NULL;
