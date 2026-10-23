# Racha

Proyecto con backend NestJS, MongoDB Atlas y app React Native con TypeScript
(Expo). Todos los comandos de esta guía se ejecutan desde la raíz.

## Requisitos e instalación

- Node.js 24.15 o posterior compatible con las dependencias y npm.
- Un cluster de MongoDB Atlas, usuario de base de datos y acceso de red habilitado.
- Expo Go compatible con SDK 58 en celular, o un emulador Android.
- Para `requests/test.http`: VS Code con REST Client de Huachao Mao.

```powershell
npm run setup
# Solo si todavía no existe .env:
Copy-Item .env.example .env
```

## Entorno compartido

El único `.env` está en la raíz y está excluido de Git. Completar:

```dotenv
MONGODB_URI=mongodb+srv://<usuario>:<contraseña>@<cluster>/<base>
PORT=3000
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
EXPO_PUBLIC_USUARIO_INICIAL_ID=<id-de-una-persona-existente>
```

`MONGODB_URI` se usa exclusivamente en el backend. La variable
`EXPO_PUBLIC_API_URL` es pública y se incorpora al bundle móvil; nunca colocar
credenciales de Atlas en ella. Las variables del proceso tienen prioridad.
El backend y el seed resuelven el `.env` respecto de sus archivos; los scripts
móviles lo cargan con Node antes de iniciar Expo, sin duplicar archivos.

`EXPO_PUBLIC_USUARIO_INICIAL_ID` es el `id` de una persona existente (por ejemplo,
`seed_ana`). En una base nueva, iniciar primero el backend para ejecutar el seed
y copiar el `_id` de esa persona desde la colección `personas` en Atlas. El
cliente envía ese valor en `x-usuario-id` al registrar o elegir perfil. La app
guarda el ID elegido en AsyncStorage y lo restaura al reabrir; la sesión guardada
prevalece sobre el entorno. «Cambiar de perfil» borra esa selección, no la persona.
Si el perfil guardado devuelve 404 se vuelve al ingreso; si falla la red se
conserva la sesión y se ofrece reintentar. Ambas variables `EXPO_PUBLIC_` son
públicas. El header es un andamio provisorio y no autentica al remitente.

| Dispositivo | Valor de `EXPO_PUBLIC_API_URL` |
| --- | --- |
| Emulador Android de Android Studio | `http://10.0.2.2:3000` |
| Celular físico en la misma red Wi-Fi | `http://<IP-LAN-de-la-PC>:3000` |
| Simulador iOS en la misma Mac | `http://localhost:3000` |

En Android, `localhost` es el propio emulador o teléfono. En Windows podés
consultar la IPv4 local con `ipconfig`. Para celular físico, permitir el puerto
del backend y la conexión de Expo en el firewall de la red privada. Si cambia
`PORT`, actualizar también el puerto de la URL móvil y de `requests/test.http`.
Después de cambiar el `.env`, reiniciar Expo con `npm run mobile -- --clear`.

Referencias: [entorno de Expo](https://docs.expo.dev/guides/environment-variables/)
y [red del emulador Android](https://developer.android.com/studio/run/emulator-networking-address).

## Ejecutar

Primera terminal:

```powershell
npm run start
```

Inicia el backend, conecta a Atlas, inicializa índices y espera la precarga
antes de aceptar HTTP. También completa puntos faltantes de check-ins antiguos
sin sobrescribir puntajes existentes. Si falta `MONGODB_URI`, informa el error.
Atlas debe permitir la IP de la computadora y el usuario debe tener permisos
sobre la base indicada en la URI.

Segunda terminal, con el emulador iniciado:

```powershell
npm run android
```

Para celular físico:

```powershell
npm run mobile
```

Abrir el QR desde Expo Go compatible con SDK 58. Crear o elegir un perfil para
entrar. La navegación usa Expo Router con pestañas Inicio, Explorar, Crear y
Perfil, y una pila para detalle, check-in, ingreso por código y edición.
La interfaz usa terracota sobre marfil y tarjetas blancas. Incluye carga, datos,
vacío, error con reintento, actualización al deslizar y al volver de una acción.
Los botones de escritura se bloquean mientras el pedido está en curso.
La consulta vence a los diez segundos si el servidor no responde.
Si Expo abre una IP de otra interfaz y queda cargando, abrir en Expo Go del
emulador `exp://10.0.2.2:8081` con Metro iniciado.

## Capa de API e identificación provisoria

Todas las llamadas móviles pasan por `mobile/src/api/cliente.ts`: URL y timeout
se configuran una vez, y cada pedido captura la persona activa para enviar
`x-usuario-id`. Los módulos `personas`, `desafios`, `participaciones`, `checkins` y `estadisticas`
ofrecen funciones tipadas y agregan la identidad a los cuerpos o rutas que la
requieren. `tipos.ts` define entradas, respuestas y validadores de datos recibidos
como `unknown`. Las pantallas no usan `fetch`, URLs ni headers directamente.

El backend exige el header en todos los endpoints HTTP. Su ausencia o formato
inválido devuelve 400; una persona inexistente devuelve 404. Las lecturas pueden
consultar recursos de otras personas. Para actuar, `persona`/`creador` debe
coincidir con el header (403 si difiere). Solo el creador edita/cancela su desafío
y cada persona puede editar/eliminar su propio perfil. Estas reglas viven en
los services; el guard global valida la identificación antes de los controladores.
Se conservan las rutas y los cuerpos previos. No se agregan respuestas 401 en
esta parte; la autenticación real corresponde a la Parte III.

## Recorrido HTTP

Abrir `requests/test.http` y ejecutar cada **Send Request** de arriba abajo.
Configurar `@usuarioInicial` con el valor del `.env` raíz. Todos los pedidos
incluyen el header; el recorrido cambia a los IDs creados cuando corresponde.
Las referencias a respuestas guardan automáticamente los IDs y el código.
Las fechas son dinámicas: inicio hoy en Buenos Aires (UTC-3) y fin dentro de
seis días UTC. Ejecutar el recorrido en el mismo día y esperar al menos un
segundo antes de reiniciarlo para evitar repetir los alias basados en timestamp.

1. Crear dos personas: 201 en cada pedido.
2. Crear un desafío con la primera: 201.
3. Unir la segunda con el código devuelto: 201.
4. Registrar un check-in: 201.
5. Repetirlo: 409 y mensaje de check-in duplicado.
6. Deshacerlo: 200 y registro eliminado; consultar historial: 200 con `items: []`.
7. Listar desafíos: 200, incluyendo el recién creado y su estado en `items`.
8. Consultar un ID inválido: 400 y mensaje de ObjectId inválido.
9. Cancelar con la segunda persona: 403 y mensaje de permiso del creador.
10. Consultar ranking, resumen de inicio, progreso, filtros paginados y resultados;
    comprobar que `pagina=0` devuelve 400. El archivo contiene 17 pedidos.

El archivo indica los estados y mensajes esperados para comparar las
respuestas manualmente. Crea datos nuevos en la base configurada y conserva
las personas y el desafío para que se vean en la app. No elimina datos previos.

## Precarga y verificaciones

```powershell
npm run seed
npm run build
npm test
npm run test:e2e
npm run test:mobile
npm run typecheck
npm run lint
npm --prefix mobile run export:android
```

El seed es idempotente: crea tres personas y dos desafíos con sus
participaciones creadoras, sin sobrescribir datos existentes. Los desafíos
nuevos duran siete días; al repetir el seed no se actualizan las fechas de
los existentes. También se ejecuta automáticamente al iniciar el backend.
El seed carga datos mediante los modelos; `test.http` verifica el flujo HTTP.

Las pruebas unitarias y e2e existentes usan servicios o almacenamiento
simulados: no certifican la conexión real con Atlas. La aceptación completa
requiere ejecutar el recorrido contra Atlas y comprobar el listado en un
celular o emulador. Consultar el estado verificado en [docs/progress.md](docs/progress.md).

## Estructura y API

- `backend/`: API NestJS y pruebas.
- `mobile/src/app/`: rutas de Expo Router; `pantallas/`, `components/` y `hooks/`
  separan vistas, piezas compartidas y ciclos de consulta/acción. `sesion.tsx`
  mantiene la identidad y su restauración. `api/` contiene el único transporte.
- `requests/test.http`: recorrido manual de aceptación.
- `docs/progress.md`: memoria técnica y verificaciones.

Las rutas principales son `/personas`, `/desafios`, `/participaciones` y
`/checkin`. `GET /desafios` recibe filtros `estado`/`categoria` y paginación en
query, sin body. `POST /participaciones` recibe
`persona` y `codigoInvitacion`. `DELETE /checkin/ultimo` recibe `persona` y
`desafio`. Las respuestas exponen `id` y omiten `_id` y `__v`.

### Contratos de Parte II

| Endpoint GET | Respuesta |
| --- | --- |
| `/desafios?pagina=1&limite=20&categoria=SALUD&estado=ACTIVO` | Página de desafíos con estado, participantes activos y participación propia |
| `/checkin/desafio/:id` | Página de check-ins con puntos |
| `/checkin/desafio/:id/persona/:personaId` | Página de check-ins de la persona |
| `/personas/:id/inicio` | Persona y desafíos vigentes con progreso, posición y check-in de hoy |
| `/desafios/:id/personas/:personaId/progreso` | Puntos, rachas, días cumplidos, participación, posición y acciones permitidas |
| `/desafios/:id/ranking` | Participantes ordenados y ganador si está finalizado |
| `/personas/:id/resultados` | Página de desafíos finalizados, progreso y ganador |

Las páginas tienen `{ items, pagina, limite, total }`. Página desde 1, límite
1–50, valores por defecto 1 y 20; entradas inválidas: 400. Fuera de rango:
`items: []`, preservando el total. Desafíos: inicio/id descendentes; historial:
día/id descendentes; resultados: fin/id descendentes. El cambio de arrays a
páginas se aplicó conjuntamente al back, cliente móvil, pruebas y archivo HTTP.
El ranking no se pagina: como máximo hay 20 participaciones activas.

### Puntos, rachas y resultado

Cada check-in guarda 10 puntos más un bonus por la cadena de días consecutivos
que termina en su día: 0 hasta 2 días, 5 entre 3 y 6, y 10 desde 7. Los siete
primeros días consecutivos suman 100. Nota y valor no modifican los puntos.
Registrar ayer después de hoy no reescribe puntos ya adjudicados. Deshacer
elimina el registro y sus puntos; las métricas se calculan con los restantes.
Crear/deshacer check-ins usa transacciones y escrituras de coordinación sobre
persona/desafío para serializar operaciones y revalidar estado y participación.

La racha actual termina hoy o ayer en la zona horaria de la persona; si pasó
un día sin registro, vale cero. La mejor racha recorre todos los días cumplidos.
Los días se comparan como calendario, sin restar 24 horas para decidir ayer.
Ranking: puntos descendentes, racha actual descendente, alias normalizado
ascendente (comparación lexicográfica), solo participantes activos. Al finalizar,
la racha del desempate usa la fecha calendario de fin del desafío como referencia
para todos los participantes; el ganador es el primero al consultar, sin job.
Se conserva la tolerancia existente para registrar ayer dentro del intervalo,
incluso al día siguiente del fin; ese registro puede cambiar el resultado.

Antes de escuchar HTTP se completan registros antiguos sin puntos en orden
cronológico de día/id, conservando cualquier puntaje existente. No es posible
reconstruir el orden histórico original de cargas retroactivas; se usa ese
criterio determinista. El proceso es repetible y no elimina registros.

### Plataformas verificadas

Android: AVD `Medium_Phone_API_36`, Android API 36 y Expo Go compatible con SDK 58.
Se comprobaron ingreso/selección, persistencia al reabrir, pestañas, creación
con selector nativo de fecha, detalle, check-in, ranking, historial y recuperación
de errores de red. Compilación TypeScript, lint y exportación Android correctas.
iOS no se ejecutó: este entorno Windows no dispone de simulador iOS ni dispositivo
iOS conectado. Esa verificación queda pendiente en un entorno compatible.

## Arquitectura de datos (MongoDB Atlas)

La persistencia usa `@nestjs/mongoose` + `mongoose` con cuatro colecciones
de nombres explícitos (sin plural automático): `personas`, `desafios`,
`participaciones` y `registros_cumplimiento`. Los esquemas viven junto a
cada entidad (`entities/*.entity.ts`) y los services/controllers siguen el
patrón estándar del CLI (`*.service.ts`, `*.controller.ts`, `*.module.ts`).

### 1. Por qué cuatro colecciones

- `personas`: identidad y zona horaria de cada participante.
- `desafios`: definición del reto (fechas, cupo, código, creador).
- `participaciones`: historial de quién participa o participó.
- `registros_cumplimiento`: un documento por persona, desafío y día.

Separarlas evita documentos gigantes que crecen sin control (un desafío
con 20 participantes durante 90 días generaría miles de checkins
embebidos) y permite consultar historiales, rankings y participaciones
con filtros específicos e índices propios.

### 2. Por qué referencias en lugar de embebidos

- Las participaciones se conservan como historial tras el abandono y el
  cupo activo no limita el historial: embeberlas mezclaría activos con
  históricos en el mismo documento.
- Los checkins crecen con el tiempo (uno por día y persona) y necesitan
  su índice único `{ persona, desafio, dia }`: embebidos obligarían a
  reescribir el desafío en cada checkin.
- Se evita duplicar los datos de la persona en cada desafío: las
  relaciones son `Desafio.creador → Persona`, `Participacion.persona →
  Persona`, `Participacion.desafio → Desafio`,
  `Checkin.persona → Persona` y
  `Checkin.desafio → Desafio`.

### 3. Por qué el día es texto `YYYY-MM-DD` y no `Date`

Guardar un instante `Date` depende de la zona horaria al convertirlo a
día calendario: el mismo instante puede ser hoy en Buenos Aires y ayer
en Madrid. El campo `dia` es texto normalizado según la zona horaria de
la persona (`diaEnZona`), validado como fecha real (rechaza `2026-02-30`
además del formato). Así el índice único diario es estable y las
comparaciones de intervalo son lexicográficas seguras.

### 4. Estados calculados y cancelación persistida

No se persiste ningún estado temporal: `PROGRAMADO`, `ACTIVO` y
`FINALIZADO` se calculan con `calcularEstadoDesafio()` desde
`fechaInicio`/`fechaFin`. Solo `CANCELADO` se persiste, mediante
`fechaCancelacion` (nula mientras no esté cancelado). Persistir el estado
temporal duplicaría información derivable y exigiría un job que lo
actualice al cambiar el día.

### 5. Índices únicos y restricciones que garantizan

- `personas.alias` único y `personas.email` único (normalizados a
  minúsculas con `lowercase: true`).
- `desafios.codigoInvitacion` único (6 caracteres generados en servidor).
- `participaciones { persona: 1, desafio: 1 }` único: impide el reingreso
  tras abandonar (el documento histórico permanece).
- `registros_cumplimiento { persona: 1, desafio: 1, dia: 1 }` único:
  impide dos checkins del mismo día.
- Índices secundarios justificados: `{ desafio, estado }` (cupo activo y
  ranking) y `{ desafio, dia }` (historial y ranking por día).

### 6. Reglas que requieren lógica de servicios y concurrencia

Los índices no bastan; estas reglas viven en los servicios:

- Tope de 5 desafíos vigentes por persona: cuenta participaciones activas
  en desafíos no cancelados cuya fecha de fin no pasó, incluidos los creados.
- Crear y unirse incrementan `Persona.__v` dentro de la transacción antes
  de contar, para coordinar solicitudes de una misma persona. La unión
  también incrementa `Desafio.__v` antes de releer estado y cupo, contar e
  insertar. Los conflictos transitorios reintentan la transacción completa.
- La edición y cancelación usan concurrencia optimista de Mongoose: si
  cambia la versión del desafío durante la operación, devuelven 409.
  Esto evita guardar un cupo calculado antes de una unión concurrente.
- Las transacciones requieren MongoDB con replica set, como MongoDB Atlas.
- Colisiones de `codigoInvitacion`: reintento ante error de clave
  duplicada 11000, no consulta previa (ventana de carrera).
- Unión solo a desafíos programados/activos; edición de fechas/cupos
  solo en programados; cupo nunca bajo activos; cancelación solo del
  creador en programados/activos; el creador no abandona; checkins solo
  hoy/ayer dentro del intervalo y con participación activa; deshacer solo
  el último checkin propio del día actual.

### 7. Configuración de `MONGODB_URI` sin publicar secretos

- Desarrollo: copiar `.env.example` a `.env` y completar
  `MONGODB_URI=mongodb+srv://<usuario>:<contraseña>@<cluster>/<base>`.
  `.env` está en `.gitignore` y nunca se commitea.
- Producción: definir `MONGODB_URI` como variable del entorno/plataforma
  (sin archivo `.env`).
- Arranque: `ConfigModule.forRoot({ validate: validarEntorno })` falla
  con mensaje claro y sin exponer la URI si falta. Los logs y errores
  nunca incluyen credenciales.

### 8. Zona horaria del estado global

El estado global (`PROGRAMADO`/`ACTIVO`/`FINALIZADO`) y el "hoy" de las
validaciones de fechas se calculan en `America/Argentina/Buenos_Aires`
(`ZONA_HORARIA_REFERENCIA`, la misma que la zona por defecto). No cambia
según cada participante: todos ven el mismo estado el mismo día de
referencia. La zona individual solo determina el `dia` de cada checkin
de cumplimiento. El cambio de día sigue esa zona de referencia.

