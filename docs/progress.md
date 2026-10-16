# Estructura del proyecto

## Backend

El código de la aplicación está en `backend/`: API HTTP con NestJS 12,
TypeScript 6 y Express. `src/main.ts` inicia `AppModule` y escucha en
`PORT` (3000 por defecto). Observe no forma parte del arranque.

Cada módulo de dominio agrupa controlador HTTP, servicio, DTO y esquema
Mongoose dentro de `entities/`:

| Módulo | Responsabilidad | Ruta base |
| --- | --- | --- |
| `personas` | Identidad y zona horaria | `/personas` |
| `desafios` | Creación, consulta, edición y cancelación de retos | `/desafios` |
| `participaciones` | Unión por código, abandono y participantes activos | `/participaciones` y `/desafios/:desafioId/participaciones` |
| `checkin` | Checkin diario, deshacer y consulta por desafío | `/checkin` |

`src/comun/` contiene constantes, funciones de fechas y validación de zonas
horarias compartidas. `src/configuracion/` valida el entorno y centraliza
la conexión a la base de datos.

## Persistencia y reglas existentes

- MongoDB mediante `@nestjs/mongoose` y `mongoose`, con las colecciones
  `personas`, `desafios`, `participaciones` y `registros_cumplimiento`.
- `MONGODB_URI` es obligatoria. `ConfigModule` carga la configuración y
  `BaseDatosModule` establece la conexión. La plantilla es `backend/.env.example`.
- Las relaciones se guardan como referencias; los esquemas definen los
  índices únicos. Los DTOs usan `class-validator` y `ValidationPipe` global;
  los servicios conservan las reglas de negocio y Mongoose valida los documentos.
- La API expone `id` como texto y omite `_id` y `__v` mediante un interceptor
  global. MongoDB, los servicios y sus pruebas conservan `_id` internamente.
- Alias y email se normalizan a minúsculas en el servicio y el esquema;
  cada campo tiene un índice único. Es el comportamiento implementado y
  cubierto por las pruebas existentes.
- La zona horaria por defecto y la referencia del estado global de los
  desafíos es `America/Argentina/Buenos_Aires`. La zona de cada persona
  determina el día de sus checkins, guardado como `YYYY-MM-DD`.

La explicación detallada del modelo, las relaciones y las restricciones
está en [backend/README.md](../backend/README.md#arquitectura-de-datos-mongodb-atlas).

## Configuración técnica

- `tsconfig.build.json` fija `rootDir: ./src` para compilar la aplicación.
  Jest define `rootDir: .` en su transformación TypeScript para compilar
  también las pruebas.
- Los scripts de Jest ejecutan Node con `--experimental-vm-modules`,
  necesario para cargar las dependencias ESM de NestJS con Jest 30.
- Prettier usa comillas simples, coma final y `endOfLine: auto` para
  respetar los finales de línea de cada archivo.
- Antes de aceptar HTTP, `main.ts` espera los índices y la precarga de 3 personas y 2
  desafíos con sus participaciones creadoras. `npm run seed` permite ejecutarla
  manualmente. Las claves estables y `$setOnInsert` conservan datos al repetirla.
- Crear y unirse comprueban el límite de 5 desafíos vigentes mediante
  participaciones activas, dentro de una transacción coordinada por `Persona.__v`.
  La unión también escribe `Desafio.__v` antes del conteo del cupo; las ediciones
  y cancelaciones usan concurrencia optimista y devuelven 409 ante versiones antiguas.
  No se almacenan contadores de cupo ni de desafíos vigentes.
- `GET /desafios` acepta `estado` y `categoria` opcionales en el body JSON;
  sin body lista todos. `GET /desafios/persona/:personaId` lista por participación.
- `POST /participaciones` recibe `persona` y `codigoInvitacion`.
  `GET /checkin/desafio/:desafioId/persona/:personaId` filtra los check-ins.
- Las pruebas unitarias están junto al código (`*.spec.ts`). Los e2e en
  `test/` verifican HTTP, validación y serialización con servicios simulados.
  El seed se prueba con almacenamiento simulado y validación Mongoose real;
  estas pruebas no verifican una conexión real ni los índices desplegados.
- Para certificar todas las reglas de B falta el texto completo de la sección 2
  de la consigna. No hay pruebas ejecutadas de concurrencia contra MongoDB real;
  Docker está instalado, pero su motor no estaba iniciado en esta verificación.
