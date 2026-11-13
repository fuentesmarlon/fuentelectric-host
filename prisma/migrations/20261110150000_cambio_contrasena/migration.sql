-- Cambio de contraseña obligatorio: cuando está en true, la persona debe elegir una
-- contraseña nueva al iniciar sesión antes de poder usar el panel.
-- Las cuentas existentes quedan en false (nadie se ve obligado por esta migración).
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "debeCambiarContrasena" BOOLEAN NOT NULL DEFAULT false;
