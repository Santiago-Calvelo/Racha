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
| `auth` | JWT Auth0, identidad externa, perfil propio y alias | `/me` |
| `tiempo-real` | Socket.IO, salas, eventos y alientos efímeros | `/socket.io` |

`src/comun/` contiene constantes, funciones de fechas y validación de zonas
horarias compartidas. `src/configuracion/` valida el entorno y centraliza
la conexión a la base de datos.

## Persistencia y reglas existentes

- MongoDB mediante `@nestjs/mongoose` y `mongoose`, con las colecciones
  `personas`, `desafios`, `participaciones` y `registros_cumplimiento`.
- `MONGODB_URI` es obligatoria. `ConfigModule` carga la configuración y
  `BaseDatosModule` establece la conexión. Desde la adecuación de entrega,
  backend y mobile tienen `.env` y `.env.example` propios dentro de sus carpetas.
  Los antecedentes con entorno raíz se conservan abajo como historial.
- Las relaciones se guardan como referencias; los esquemas definen los
  índices únicos. Los DTOs usan `class-validator` y `ValidationPipe` global;
  los servicios conservan las reglas de negocio y Mongoose valida los documentos.
- La API expone `id` como texto y omite `_id` y `__v` mediante un interceptor
  global. MongoDB, los servicios y sus pruebas conservan `_id` internamente.
- Alias y email se normalizan a minúsculas. En Parte III el alias usa un índice
  único parcial y el email conserva unicidad solo para personas antiguas sin
  emisor. La identidad Auth0 es única por `emisor`/`sujeto`, sin enlace por email.
- La zona horaria por defecto y la referencia del estado global de los
  desafíos es `America/Argentina/Buenos_Aires`. La zona de cada persona
  determina el día de sus checkins, guardado como `YYYY-MM-DD`.

La explicación detallada del modelo, las relaciones y las restricciones
está en [README.md](../README.md#arquitectura-de-datos-mongodb-atlas).

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
- Desde la implementación completa de Parte II, `GET /desafios` recibe filtros
  y paginación por query y devuelve una página. `GET /desafios/persona/:personaId`
  conserva el listado por participación.
- `POST /participaciones` recibe `persona` y `codigoInvitacion`.
  `GET /checkin/desafio/:desafioId/persona/:personaId` filtra los check-ins.
- Las pruebas unitarias están junto al código (`*.spec.ts`). Los e2e en
  `test/` verifican HTTP, validación y serialización con servicios simulados.
  Desde Parte III también hay conexiones Socket.IO reales de loopback.
  El seed se prueba con almacenamiento simulado y validación Mongoose real;
  estas pruebas no verifican una conexión real ni los índices desplegados.
- Para certificar todas las reglas de B falta el texto completo de la sección 2
  de la consigna. No hay pruebas ejecutadas de concurrencia contra MongoDB real;
  Docker está instalado, pero su motor no estaba iniciado en esta verificación.

## App móvil y recorrido HTTP (2026-10-23)

- Alcance aprobado: Expo con React Native y TypeScript en `mobile/`, un único
  `.env` y `README.md` en la raíz, y recorrido en `requests/test.http`.
- `package.json` raíz ofrece instalación desde los lockfiles, arranque del
  backend, Expo, Android, seed, compilación, pruebas, lint y chequeo de tipos.
- La pantalla inicial de Parte I fue reemplazada en Parte II por rutas en
  `mobile/src/app/` y pantallas en `mobile/src/pantallas/`.
- La primera capa `mobile/src/api.ts` fue reemplazada en Parte II por
  `mobile/src/api/`: conserva URL de entorno, validación, timeout y cancelación.
- Los scripts de Expo cargan `../.env` con Node antes de iniciar el CLI.
  La app referencia las variables `EXPO_PUBLIC_` documentadas; la URI de
  MongoDB pertenece al backend. El arranque y seed resuelven el `.env` raíz
  desde `__dirname`, tanto en fuente como compilados.
- El README raíz conserva la arquitectura de datos del antiguo README del
  backend y documenta instalación, Atlas, emulador, celular y pruebas.
- `requests/test.http` usa REST Client de VS Code, fechas dinámicas y referencias
  a IDs/código devueltos. Crea dos personas y un desafío, une por código,
  registra/deshace el check-in, consulta historial y listado, y contiene
  tres errores esperados: 400 por ID, 403 por cancelación ajena y 409 por duplicado.
  Los estados y mensajes se comparan manualmente. Conserva los datos creados.

Verificaciones ejecutadas:

- Compilación backend correcta; 64 pruebas unitarias y 7 e2e correctas.
- TypeScript móvil y lint de backend/app correctos.
- Exportación Android con Metro y Hermes correcta (Expo SDK 58).
- Siete comprobaciones temporales del cliente HTTP en Node: listado válido,
  vacío, contrato inválido, respuesta 503, URL ausente, servidor caído y timeout.
  Se usó un servidor HTTP local controlado y una simulación para el timeout;
  no verifican renderizado nativo ni Atlas.
- En la verificación inicial sin URI, `npm run start` desde la raíz compiló y
  falló con el mensaje previsto de `MONGODB_URI` ausente. El `.env` está ignorado.
- Diff revisado sin errores de espacios. La instalación informó advertencias
  de motor con Node 24.9 y vulnerabilidades de dependencias (5 en backend,
  15 en móvil); no se aplicaron actualizaciones fuera del alcance aprobado.
  El README recomienda Node 24.15 o posterior compatible.

Verificación real después de que el programador completó `MONGODB_URI`:

- `npm run start` desde la raíz conectó a MongoDB Atlas, completó el seed y
  empezó a aceptar HTTP sin modificar código. Se comprobó que el host de la
  URI pertenece a Atlas, sin imprimir ni registrar credenciales.
- Se ejecutaron los once pedidos de `requests/test.http` mediante un intérprete
  temporal en Node, resolviendo fechas y referencias a respuestas del archivo.
  Todos devolvieron el estado esperado. Se comprobaron los tres mensajes de
  error exactos: duplicado 409, ObjectId inválido 400 y cancelación ajena 403.
- El historial quedó vacío después de deshacer el check-in. El listado devolvió
  tres desafíos, incluido `Caminar cada día HTTP` con estado `ACTIVO`.
  Las dos personas y el desafío de la prueba permanecen en Atlas.
- Se inició `Medium_Phone_API_36`, se instaló Expo Go y se abrió la app. Captura
  e inspección de la jerarquía nativa confirmaron los tres desafíos de Atlas
  con nombre, categoría, estado y fechas. La URL de API provino del `.env` raíz:
  `http://10.0.2.2:3000`. Para abrir Metro se usó `exp://10.0.2.2:8081` en el AVD.
- Con el backend detenido se observó el mensaje de conexión fallida y el botón
  `Reintentar`. Al reiniciar el backend y pulsar el botón, apareció el listado.
- Las capturas y la jerarquía de verificación están en `mobile/.expo/`, ignoradas
  por Git. Backend y Metro quedaron iniciados al terminar la comprobación.

La definición de terminado de la Parte I quedó verificada contra Atlas y en el
emulador Android. No se hicieron cambios funcionales durante esta verificación.

## Parte II, consigna A: capa API e identificación (2026-10-23)

Decisiones aprobadas: cliente único con `fetch`, funciones tipadas por recurso,
selector provisional en memoria, `x-usuario-id` en todos los pedidos y variable
`EXPO_PUBLIC_USUARIO_INICIAL_ID` en el `.env` raíz para resolver el primer pedido.
Se configuró localmente con `seed_ana`; el ID no está escrito en el código móvil.
El mockup posterior se implementó con la paleta terracota acordada; ver el estado final abajo.

Implementación:

- `mobile/src/api/cliente.ts`: configuración única, header, JSON, timeout,
  cancelación y errores HTTP con status/mensaje del backend. Captura la identidad
  al comenzar cada pedido. `seleccionarUsuario` cambia la identidad en memoria.
- `tipos.ts` define entradas, respuestas y validadores de los cuatro recursos.
  Los datos se reciben como `unknown`, sin `any`. Se distingue el desafío base
  de las respuestas de listado, que incluyen `estado`, y las participaciones
  con persona poblada (admitiendo `null` si la referencia fue eliminada).
- `personas.ts`, `desafios.ts`, `participaciones.ts` y `checkins.ts` encapsulan
  los endpoints actuales. No envían body en GET. El listado móvil pide todos
  los desafíos; no se modificó el contrato anterior de filtros GET en body.
- `App.tsx` consume funciones de recurso y agrega el selector horizontal. No
  arma URLs, headers ni pedidos. Al cambiar usuario cancela la carga anterior
  y vuelve a consultar. Al reiniciar vuelve al usuario configurado en el entorno.
- `UsuarioGuard` global valida header obligatorio y existencia de la persona
  para todos los endpoints. Ausente/malformado: 400; persona inexistente: 404.
  No es autenticación y no incorpora 401. Las lecturas de terceros se conservan.
- Los services exigen coincidencia de actor con `persona`/`creador` en las
  escrituras y la ruta de abandono (403 si difiere). Solo el creador edita su
  desafío; cada persona edita/elimina su propio perfil. Se conservaron DTOs,
  rutas y cuerpos, y se agregó el argumento de actor a las operaciones afectadas.
- `requests/test.http` agrega los headers de cada actor y la variable inicial;
  el README raíz explica configuración y permisos. `npm run mobile -- --clear`
  ahora reenvía correctamente `--clear` a Expo desde el script raíz.

Verificación:

- Backend compilado; 64 pruebas unitarias y 17 e2e correctas. Las e2e nuevas
  usan los services reales con modelos simulados para rechazar suplantación y
  edición ajena, además de comprobar identificación ausente/inválida/inexistente.
- `npm run test:mobile`: seis pruebas correctas del cliente real con transporte
  controlado, cubriendo headers/cambio de usuario, cuerpos y rutas por recurso,
  errores HTTP, contratos inválidos, configuración, red, timeout y cancelación.
- TypeScript móvil y lint correctos; búsqueda confirma un solo `fetch` (cliente)
  y ningún `any` en código móvil. No se agregaron dependencias.
- Contra Atlas, los once pedidos de `requests/test.http` pasaron con sus headers
  y mensajes esperados, más cuatro comprobaciones de identificación/suplantación.
  Se conservan las dos personas y el desafío nuevos de ese recorrido.
- Se probaron las funciones tipadas de lectura de los cuatro recursos y cambio
  de identidad contra el backend actualizado con datos reales.
- Android renderizó selector y desafíos. La jerarquía nativa confirmó el cambio
  de Ana a Bruno (`selected=true`) y la recarga correcta. Captura/jerarquía en
  `mobile/.expo/`, ignoradas. Metro se abrió con `exp://10.0.2.2:8081`.
- Se usó temporalmente el puerto 3001 para no interrumpir el backend previo;
  luego se reinició la versión actualizada en 3000 y se cerró la de pruebas.
  Backend 3000 y Metro 8081 quedaron iniciados con la nueva configuración.

La consigna A quedó implementada y verificada; el diseño definitivo y la
autenticación real de Parte III quedan fuera de este alcance.

## Diseño documental de contratos e interfaz (2026-10-23)

- Alcance aprobado más reciente: solo documentar contratos faltantes y diseño;
  no implementar la Parte II completa ni agregar datos simulados.
- Referencia: mockup de doce vistas aportado por el programador. Colores
  aprobados: terracota `#C65D3B`, botones `#A9472B`, fondo marfil y tarjetas blancas.
- Se recibió la regla de puntos (10 base, bonus 0/5/10), rachas, ranking por
  puntos/racha/alias y ganador calculado al consultar un desafío finalizado.
- El documento de contratos e interfaz definió tipos, rutas, paginación,
  navegación, pantallas y estados; luego se eliminó por pedido del programador,
  al trasladar las decisiones implementadas al README y a esta memoria.
- Pendientes de decisión: puntos al registrar ayer después de hoy, efectos de
  deshacer, referencia temporal del ranking final, tolerancia de ayer tras
  finalizar, tratamiento de registros antiguos sin puntos y orden de alias.
  Las recomendaciones del documento no son implementación ni reglas aprobadas.
- Se revisó compatibilidad con controladores, esquemas y reglas actuales.
  Solo se modificó documentación; no corresponde ejecutar pruebas funcionales.

## Implementación completa de Parte II (2026-10-23)

El programador autorizó implementar el diseño y retirar su documento al terminar.
Se adoptaron las recomendaciones de puntuación retroactiva, deshacer y resultado
final. Las decisiones efectivas y contratos están en el README raíz.

- Backend: nuevo módulo `estadisticas/` con rachas, puntos, ranking/ganador,
  progreso, inicio agregado y resultados finalizados. Las lecturas devuelven
  datos reales de Atlas y mantienen el header obligatorio.
- Se adjudican 10/15/20 puntos al registrar según la cadena que termina en el
  día solicitado; insertar ayer no reescribe puntajes de hoy. Deshacer elimina
  registro y puntos. Las transacciones coordinan check-in/deshacer y otras
  escrituras por `Persona.__v`/`Desafio.__v`. Ayer se calcula como día calendario.
- Rachas finales: fecha calendario de fin como referencia común para desempatar;
  se conserva la tolerancia para registrar ayer tras finalizar. Ganador calculado
  al consultar, solo participaciones activas. Alias con comparación lexicográfica.
- Antes de HTTP, `PuntosHistoricosService` completa solo puntajes faltantes en
  orden de día/id, sin sobrescribir valores existentes. Ese orden determinista
  no pretende reconstruir el orden de creación de check-ins retroactivos antiguos.
- Se corrigieron referencias Mongoose de `Types.ObjectId` a
  `Schema.Types.ObjectId`: eran campos Mixed, por lo que consultas por ID texto
  fallaban. Los documentos existentes conservan sus IDs. Hay prueba de regresión.
- Paginación DB en desafíos, historial y resultados: `{ items, pagina, limite,
  total }`, query validada, orden estable, filtros antes de contar/paginar.
  Se actualizaron simultáneamente cliente, pruebas y `requests/test.http`.
- App: Expo Router con pestañas y pila, tema terracota/marfil, ingreso/registro,
  sesión AsyncStorage, inicio, explorar/filtros, unirse por código, crear con
  selector nativo de fecha, detalle/resumen/participantes/ranking/historial,
  check-in/deshacer, abandono/cancelación, perfil editable y resultados.
- Bienvenida tiene ruta propia `/bienvenida`; Inicio ocupa el índice del grupo
  de pestañas. La protección de rutas redirige al cambiar sesión, sin mezclar
  dos índices `/` ni redirecciones manuales concurrentes. Se detectó y corrigió
  el bucle de navegación durante la prueba real de cambio de perfil.
- `useConsulta`, `usePagina` y `useAccion` concentran foco/refresh, paginación,
  cancelación y bloqueo de doble toque. El cliente tipado sigue siendo el único
  lugar con `fetch`. Errores de red/timeout y del servidor se explican en pantalla;
  hay reintento y fallback comprensible para rutas/errores imprevistos.

Verificaciones ejecutadas:

- Backend compilado; 70 pruebas unitarias, 17 e2e y 7 pruebas móviles correctas.
  Se cubren bonus, días calendario, interrupción/racha de ayer, ranking por
  puntos/racha/alias, ganador final y tipos de referencias Mongoose.
- TypeScript móvil, lint y exportación Android correctos; archivos nuevos y
  modificados revisados dentro del límite de 600 líneas (lockfile es datos).
- Los 17 pedidos de `requests/test.http` pasaron contra Atlas con sus estados
  y mensajes esperados, incluyendo ranking, inicio, progreso y paginación inválida.
- Flujo con dos identidades independientes contra Atlas: crear/unirse, check-ins,
  cambio de ranking al refrescar, desempate, deshacer, resumen e historial. Dos
  registros simultáneos del mismo día produjeron un 201 y un 409, sin duplicado.
- Android API 36/Expo Go: ingreso, selección, pestañas, selector de fechas,
  creación de desafío, check-in de 10 puntos, ranking, historial y vacío de
  resultados finalizados. Ana creó el desafío de prueba desde la app; Bruno
  ingresó en otra sesión, se unió por código y registró su propio check-in.
- Tras deshacer el check-in de Ana por API, pull-to-refresh en Android mostró a
  Bruno en puesto 1 y Ana en puesto 2 con cero puntos: cambio real entre sesiones.
- Sesión persistida: al reabrir se restauró Bruno, distinto del ID inicial Ana.
  Con backend apagado apareció timeout/reintento conservando la sesión; al
  reiniciar y reintentar volvió al inicio de Bruno, sin pantalla en blanco.
- Capturas/jerarquías en `mobile/.expo/`, ignoradas. Se conservan datos de pruebas
  creados en Atlas. Backend 3000 y Metro 8081 quedan activos.
- iOS no probado: no hay simulador/dispositivo iOS disponible en este Windows.

Documento de propuesta retirado por solicitud explícita. No se agregaron
notificaciones, categorías, unidades ni métricas ficticias del mockup.

## Parte III: Auth0, Socket.IO y alientos (2026-11-06)

Alcance aprobado explícitamente: Auth0/Google con SDK nativo y development build,
JWT global, identidad externa sin enlace automático con personas antiguas,
alias posterior, renovación con un reintento, salas/eventos y alientos efímeros.
El programador completará el `.env` real; la plantilla no contiene secretos.

- `auth/`: verifica RS256/JWKS, emisor, audiencia, firma, exp/iat/sub; ausencia,
  token inválido o vencido responden 401. `UsuarioGuard` es global, el decorador
  `Publica` está disponible y no se utiliza en las rutas actuales.
- `GET /me`, `PATCH /me` y `PATCH /me/alias`. El primer pedido resuelve la persona
  con userinfo del mismo sujeto; upsert por emisor/sub soporta primeros ingresos
  concurrentes. Alias normalizado, único y elegido una vez; conflicto 409.
- Se retiraron header provisional, selección de personas y actores HTTP del
  cuerpo/ruta de escritura. Los DTO HTTP omiten actor y los servicios internos
  reciben el ID derivado del token. Las rutas por persona conservadas son lecturas.
- MongoDB conserva documentos antiguos. Alias opcional con índice parcial;
  email único solo entre antiguos sin emisor. `IndicesAuthService` prepara los
  índices antes del seed/HTTP, también en el seed manual. `autoIndex: false`
  evita que Mongoose intente crear los nuevos antes de reemplazar los anteriores.
  Esto cambia índices reales en el próximo arranque y todavía no se probó en Atlas.
- SDK `react-native-auth0` 6.2 y Credential Manager para almacenamiento seguro,
  sin AsyncStorage. Refresh coordinado entre HTTP/socket; un 401 reintenta una vez,
  y un fallo de renovación borra sesión. Logout espera renovaciones pendientes
  para evitar que el SDK vuelva a persistir una credencial tras cerrar sesión.
- App: Google, completar alias, cierre de sesión y protección de rutas. El perfil
  permite editar nombre/zona horaria aunque el proveedor no entregue email.
- Socket.IO: handshake autenticado, expiración de conexión, salas de participantes
  activos, salida al perder foco, reconexión al volver del segundo plano,
  resuscripción y consulta real. Eventos después de resolver escrituras; avisos
  breves y recarga de ranking/progreso/historial. Catálogo completo en README.
- Alientos 👏 💪 🔥 🎉 ❤️ entre participantes activos distintos, límite compartido
  por persona/desafío de diez segundos y errores por acknowledgement. Sin MongoDB,
  historial ni reenvío. Salas y límite en memoria para un único proceso.
- Expo: configuración nativa dinámica desde variables públicas, scheme `racha`,
  identificador `com.racha.app`, perfil EAS development y arranque `--dev-client`.
  Se fijó react-dom 19.3.0 a la misma versión de React para resolver el conflicto
  de instalación preexistente. Dependencias y lockfiles actualizados.
- README y recorrido HTTP actualizados para dos access tokens reales. REST Client
  los toma del entorno de VS Code; no se incluyen valores en archivos versionados.

Verificación actual:

- Backend compilado; 84 pruebas unitarias y 16 e2e correctas. Incluyen validación
  criptográfica real con claves de prueba, permisos HTTP, contratos sin actor,
  vinculación/alias e índices con repositorios controlados; también handshake,
  salas, reconexión y alientos con servidor/cliente Socket.IO reales de loopback.
- 14 pruebas móviles correctas con transportes/SDK/ciclo de foco controlados:
  Bearer, reintento único, renovación concurrente, cierre durante renovación,
  reconexión, resuscripción y actualización del detalle. No son renderizado nativo.
- TypeScript móvil, lint sin advertencias y diff sin errores de espacios correctos.
  Archivos modificados/nuevos dentro del límite de 600 líneas (lockfiles son datos).
- Exportación Android/Hermes correcta; exportación con dominio
  público de ejemplo, sin credenciales reales. La exportación no compila un APK.
- Instalación informó 31 vulnerabilidades en backend y 11 en móvil; no se ejecutó
  audit fix ni se cambiaron dependencias fuera del alcance. Node local 24.9.0;
  el proyecto recomienda 24.15 o posterior compatible.

Pendiente de configuración del programador: tenant Native/API RS256, Google,
callbacks/logout, offline access y refresh token rotation, y completar variables.
No se probó login real, almacenamiento nativo, renovación contra Auth0, migración
contra Atlas ni recorrido de dos cuentas en un development build. Las pruebas
Android/Expo Go de Parte II son históricas y no certifican esta Parte III.
iOS sigue sin dispositivo/simulador disponible. No se desplegó ni se creó un
build remoto: requiere la configuración y cuenta Expo del programador.

## Adecuación del formato de entrega (2026-11-06)

Alcance aprobado: entornos por aplicación, URL opcional de WebSockets, tabla HTTP
completa y colección Postman. No incluye commits/tags ni documentos de Parte IV.

- Se retiró `.env.example` raíz y se crearon `backend/.env.example` y
  `mobile/.env.example`. La plantilla backend documenta Auth0 y reserva las tres
  variables de versión/sunset de Parte IV, marcadas expresamente sin implementar.
- `AppModule` y seed cargan `backend/.env` desde fuente y compilados. Los scripts
  de Expo cargan `mobile/.env`; la configuración nativa indica esa ubicación.
- Se conservó `backend/.env` sin modificar. Se creó el entorno móvil con las
  variables EXPO_PUBLIC ya existentes, sin copiar URI de Atlas ni secretos.
  Faltaba EXPO_PUBLIC_API_URL: se inicializó para el emulador Android con
  10.0.2.2 y el puerto configurado del backend. WS queda vacío y usa ese respaldo.
- El cliente admite EXPO_PUBLIC_WS_URL; solo Socket.IO la consume. API HTTP
  conserva su URL independiente. Pruebas verifican ambas configuraciones.
- README con los 22 endpoints (verbo/ruta/función/éxito/errores), instalación con
  entornos separados, arranque, build local/EAS, catálogo y estado real de pruebas.
- `rachas.postman_collection.json`: Collection v2.1, 32 pedidos ordenados para dos
  identidades; captura IDs/código, calcula fechas, crea un reto programado y lo
  adelanta a hoy para check-ins. Comprueba métricas, errores y cierre; conserva
  los datos creados. tokenAna/tokenBruno se ingresan en un entorno privado de
  Postman, no se almacenan en la colección versionada.
- Las secciones históricas de esta memoria con entorno raíz describen etapas
  anteriores. La configuración vigente es la de esta adecuación.

Verificaciones:

- Backend compilado; 84 unitarias, 16 e2e y 15 pruebas móviles correctas.
  TypeScript móvil y lint correctos. No se instalaron dependencias nuevas.
- Coincidencia comprobada entre los 22 endpoints extraídos de los controladores,
  la tabla README y los pedidos Postman. JSON y 33 scripts comprobados localmente;
  39 aserciones ejecutadas con respuestas controladas. Cero pedidos reales enviados.
  Esto no certifica importación en Postman ni una ejecución contra Auth0/Atlas.
- Resolución de backend/.env verificada desde fuente y dist; scripts móviles con
  entorno propio. Variables públicas locales conservadas y configuración requerida
  presente. Los dos .env reales siguen ignorados por Git.
- Diff sin errores de espacios; README, memoria y colección bajo 600 líneas.
  No hubo coincidencias con secretos locales en los archivos destinados a Git
  ni en los 350 objetos revisados del historial local alcanzable. La comprobación
  no cubre secretos desconocidos ni referencias exclusivas del remoto.

Pendientes: verificación real de Parte III en el development build, selección de
commits y creación de tags de entrega; Parte IV y sus tres documentos/versionado.
No se reescribió historial, no se publicó ni se hizo un envío a WebCampus.
