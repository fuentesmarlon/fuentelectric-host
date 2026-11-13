# Pizarra de Horarios - Fuentelectric

Sistema web para la automatización y gestión de asignación de turnos (esquema 4x2) para las cuadrillas e linieros de Fuentelectric.

## Documentación

Manuales de entrega en [`docs/manuales/`](docs/manuales/index.html) (HTML y PDF): documentación del sistema, manual técnico, guía del administrador, guía del trabajador y presentación de funcionalidades.

## Stack Tecnológico
Este proyecto está construido con las siguientes tecnologías:
* **Framework:** Next.js (App Router)
* **Base de Datos:** PostgreSQL alojada en Supabase
* **ORM:** Prisma
* **Estilos & UI:** Tailwind CSS + shadcn/ui
* **Correos:** Resend
* **Monitoreo:** Sentry

---

## Reglas de Negocio (Lógica de Asignación)

El núcleo del sistema reemplaza el control manual en Excel por un motor de asignación automática basado en las siguientes reglas operativas:

### Conceptos Clave
* **Turno:** Bloque de trabajo ininterrumpido de 12 horas.
  * *Diurnos:* 07:00 a 19:00 | 08:00 a 20:00
  * *Nocturnos:* 19:00 a 07:00 | 20:00 a 08:00
* **Unidad:** Vehículo físico asignado para salir a campo.
  * 10 Carros (A-111 al A-120)
  * 4 Camiones (A-141, A-142, A-150, A-151)
* **Área:** La zona o departamento operativo (Ej. Escuintla, Escuintla canasta frío, Escuintla Líniero frío, Escuintla camión canasta).
* **Equipo (Cuadrilla):** Grupo estricto de **3 personas** (trabajadores) asignadas a una misma unidad.

### El Patrón 4x2
Cada trabajador opera bajo un ciclo rotativo estricto: **Trabaja 4 días consecutivos (12 hrs) y descansa 2 días.**

> **Notas Pendientes de Definición con Operaciones:**
> * *[TODO]* Definir si el sistema debe bloquear el cambio de unidad de una persona en la misma semana.
> * *[TODO]* Definir cómo se registrarán las excepciones al patrón 4x2 (días festivos nacionales, emergencias climáticas).
> * *[TODO]* Definir el flujo para reemplazos, incapacidades, vacaciones y vacantes temporales (¿Permitir "Sustitutos Temporales" rompiendo la regla de 3 base?).
> * *[TODO]* El sistema mostrará la programación futura y mantendrá un historial de lectura de los meses anteriores para auditoría.

---

## Instalación y Entorno de Desarrollo

Para levantar este proyecto en un entorno local:

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/PabloGarcia2810/fuentelectric_asistence_table
   ```
2. Instalar dependencias (también genera el cliente de Prisma):
   ```bash
   pnpm install
   ```
3. Configurar variables de entorno:
   copiar `.env.example` a `.env` y completar las credenciales de Supabase y Resend.
   En producción (Vercel) usar en `DATABASE_URL` el pooler de Supabase en modo *transaction* (puerto 6543) y en `DIRECT_URL` el modo *session* (5432) para las migraciones.
4. Aplicar las migraciones a la base de datos:
   ```bash
   pnpm exec prisma migrate deploy
   ```
   Para crear una migración nueva tras cambiar `prisma/schema.prisma` usar `pnpm exec prisma migrate dev --name <descripcion>`.
5. Iniciar el servidor:
   ```bash
   pnpm dev
   ```

### Comprobaciones

```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript
pnpm test        # tests (node:test, sin conexión a la base de datos)
```

### Notas de operación

* Las fechas "de hoy" se calculan en hora de Guatemala (`America/Guatemala`), aunque el servidor corra en UTC.
* Roles (`src/lib/roles.ts`): `TRABAJADOR` (solo consulta), `ADMIN` (turnos y catálogos) y `SUPERADMIN` (además, cuentas de acceso en `/tableros/cuentas`).
* Sesiones: 1 hora para administradores y superadministradores (entran con contraseña o código) y 30 días para trabajadores (solo código), verificadas en el servidor.
* Cambio de contraseña obligatorio: el superadministrador puede marcar una cuenta de administrador para que, al entrar, elija una contraseña nueva antes de usar el panel (`/cambiar-contrasena`, columna `Usuario.debeCambiarContrasena`).
* El inicio de sesión limita los intentos y el envío de códigos por correo/IP (límite en memoria por instancia).

## Entornos (producción y staging)

| Entorno | Base de datos | Dónde se configura | `NEXT_PUBLIC_ENTORNO` |
|---|---|---|---|
| **Producción** | Proyecto Supabase de producción | Vercel → Environment Variables → *Production* | `produccion` |
| **Staging** (previews de PR) | Proyecto Supabase de staging | Vercel → Environment Variables → *Preview* | `staging` |
| **Desarrollo local** | Proyecto Supabase de staging | `.env` local | `desarrollo` |

* El `.env` local **nunca** debe tener credenciales de producción.
* Fuera de producción aparece una etiqueta fija en pantalla ("Staging" / "Desarrollo local") y Sentry separa los errores por entorno.
* Toda migración se aplica primero en staging (`pnpm db:migrate` con el `.env` local) y, tras probarla, en producción.

### Preparar la base de staging

```bash
pnpm db:migrate   # crea las tablas en la base del .env (staging)
pnpm db:seed      # carga áreas, unidades, 18 trabajadores y turnos de prueba
```

`db:seed` se niega a correr si `NEXT_PUBLIC_ENTORNO` no es `staging`/`desarrollo` o si la base ya tiene trabajadores reales.
Para crear cuentas de acceso de prueba, define `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` y/o `SEED_TRABAJADOR_EMAIL` (ver `.env.example`).

## Pruebas en la base real antes de la entrega

Mientras la empresa no use el sistema, se puede probar sobre la base real y dejarla limpia después:

```bash
pnpm entrega respaldar               # 1. copia Áreas, Vehículos, Trabajadores y Usuarios a respaldos/ (no se sube a git)
# 2. probar la aplicación
pnpm entrega revisar                 # 3. qué cambió en los catálogos respecto al respaldo
pnpm entrega restaurar --confirmar   # 4. (si hizo falta) devolver los catálogos al respaldo
pnpm entrega limpiar --confirmar     # 5. borrar TODAS las asistencias y el historial
```

Sin `--confirmar`, `restaurar` y `limpiar` solo muestran lo que harían. Las cuentas de Supabase Auth no se tocan.
**No usar `limpiar` una vez que la empresa esté registrando turnos reales.**

## Estructura del código

```
src/
├── app/
│   ├── tableros/<sección>/   page.tsx (servidor: datos) · *Client.tsx (UI) · actions.ts (mutaciones)
│   ├── api/historial/        rutas de exportación PDF/Excel (solo permisos + respuesta)
│   └── login/                acceso por contraseña (admin) y código OTP (trabajador)
├── lib/
│   ├── reglas-turno.ts       reglas de negocio de turnos (cupo, doble jornada, entrega de unidad)
│   ├── sesion.ts · auth.ts   sesión y permisos (páginas / acciones y API)
│   ├── turnos-consulta.ts    consultas de turnos y ventana de fechas paginada
│   ├── reportes/{pdf,excel}/ generación de reportes, un módulo por sección/hoja
│   └── form-validation.ts    validaciones y fechas en hora de Guatemala
└── components/               UI compartida (shadcn/ui + componentes del panel)
```

* **Reglas de negocio:** crear, editar y la carga masiva usan las mismas funciones de `lib/reglas-turno.ts`.
* **Datos paginados:** Asistencias carga el mes visible (o un rango de hasta 93 días); el Historial pagina de 100 en 100 en el servidor.
* **CI:** `.github/workflows/ci.yml` ejecuta lint, TypeScript, tests y build en cada push a `main`/`dev` y en cada pull request.
* **Base de datos:** RLS activado en todas las tablas (la app usa el rol `postgres`, que no se ve afectado).

## Pendientes acordados

* **Vista "mis turnos" para trabajadores:** `Usuario` (cuenta de acceso) y `Trabajador` (registro operativo) no están vinculados. Se integrará cuando se definan las reglas (qué ve cada trabajador, trabajadores sin cuenta, etc.).

## Colaboradores
* Marlon Fuentes Gestor de proyecto
* Pablo García Desarrollador