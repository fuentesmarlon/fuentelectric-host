-- Nuevo rol: SUPERADMIN (puede todo lo de ADMIN y además administra las cuentas de acceso).
-- Solo agrega el valor; ninguna cuenta cambia de rol con esta migración.
ALTER TYPE "RolUsuario" ADD VALUE IF NOT EXISTS 'SUPERADMIN';
