-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'TRABAJADOR');

-- CreateEnum
CREATE TYPE "TipoVehiculo" AS ENUM ('CARRO', 'CAMION');

-- CreateEnum
CREATE TYPE "HorarioBase" AS ENUM ('DIURNO_06_18', 'DIURNO_07_19', 'DIURNO_08_20', 'NOCTURNO_19_07', 'NOCTURNO_20_08');

-- CreateEnum
CREATE TYPE "EstadoDia" AS ENUM ('TRABAJO_12', 'DESCANSO_D', 'INCAPACIDAD', 'VACACIONES');

-- CreateEnum
CREATE TYPE "TipoTurno" AS ENUM ('DIURNO', 'NOCTURNO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'TRABAJADOR',

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trabajador" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "puesto" TEXT,
    "disponibilidad" TEXT NOT NULL DEFAULT 'Activo',
    "horarioEstablecido" "HorarioBase" NOT NULL,

    CONSTRAINT "Trabajador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehiculo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoVehiculo" NOT NULL,
    "noPersonas" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "Vehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnoDiario" (
    "id" TEXT NOT NULL,
    "asignadoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoDia" NOT NULL,
    "tipoTurno" "TipoTurno" NOT NULL,
    "horario" "HorarioBase" NOT NULL,
    "areaId" TEXT NOT NULL,
    "comentario" TEXT,
    "vehiculoId" TEXT NOT NULL,

    CONSTRAINT "TurnoDiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnapshotTurno" (
    "id" TEXT NOT NULL,
    "fechaGuardado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nombreTrabajador" TEXT NOT NULL,
    "areaTrabajo" TEXT NOT NULL,
    "vehiculoPlaca" TEXT NOT NULL,
    "tipoTurno" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "comentario" TEXT,
    "usuarioResponsable" TEXT NOT NULL,

    CONSTRAINT "SnapshotTurno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Area_nombre_key" ON "Area"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Vehiculo_codigo_key" ON "Vehiculo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "TurnoDiario_asignadoId_fecha_key" ON "TurnoDiario"("asignadoId", "fecha");

-- AddForeignKey
ALTER TABLE "TurnoDiario" ADD CONSTRAINT "TurnoDiario_asignadoId_fkey" FOREIGN KEY ("asignadoId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnoDiario" ADD CONSTRAINT "TurnoDiario_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnoDiario" ADD CONSTRAINT "TurnoDiario_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
