# Racha

Backend NestJS, MongoDB Atlas y app React Native con TypeScript (Expo SDK 58).
Los comandos se ejecutan desde la raíz. Parte III usa Auth0 con Google y Socket.IO.
Entrega limitada a Partes I–III por decisión del autor. Parte IV no realizada.

## Instalación y entorno

- Node.js 24.15 o posterior compatible y npm.
- MongoDB Atlas con la IP del backend permitida y permisos de escritura/índices.
- Tenant Auth0, aplicación **Native** y una API personalizada con firma **RS256**.
- Android con un development build. El SDK de Auth0 **no funciona en Expo Go**.
- Android mínimo: 8.0 (API 26), requerido por el SDK nativo de Auth0.
- Para navegador: una aplicación Auth0 **Single Page Application** separada.

```powershell
npm run setup
# Crear solo los archivos que todavía no existan:
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (!(Test-Path mobile/.env)) { Copy-Item mobile/.env.example mobile/.env }
```

Cada aplicación tiene su `.env`, ignorado por Git. No se usa un `.env` raíz.
Completar `backend/.env` a partir de `backend/.env.example`:

```dotenv
MONGODB_URI=mongodb+srv://<usuario>:<contraseña>@<cluster>/<base>
PORT=3000
AUTH0_DOMAIN=<tenant>.us.auth0.com
AUTH0_AUDIENCE=https://racha.api
```

Completar `mobile/.env` a partir de `mobile/.env.example`:

```dotenv
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
EXPO_PUBLIC_WS_URL=http://10.0.2.2:3000
EXPO_PUBLIC_AUTH0_DOMAIN=<tenant>.us.auth0.com
EXPO_PUBLIC_AUTH0_CLIENT_ID=<client-id-de-la-aplicacion-native>
EXPO_PUBLIC_AUTH0_AUDIENCE=https://racha.api
```

Dominio sin `https://` ni barra final. Backend y app deben usar el mismo tenant
(y dominio personalizado, si corresponde) y audience. La audience identifica la
API; no tiene que ser una URL accesible. Las variables `EXPO_PUBLIC_` se incluyen
en el bundle y son públicas. `MONGODB_URI` y los tokens de prueba son secretos.
La API verifica claves públicas JWKS: **no necesita Auth0 Client Secret**.
Las credenciales de Google se ingresan en el dashboard de Auth0, nunca en la app.
Backend y seed resuelven `backend/.env` tanto en fuente como compilados; los
scripts de mobile cargan `mobile/.env`. Las variables del proceso tienen prioridad.
`MIN_APP_VERSION`, `RECOMMENDED_APP_VERSION` y `V1_SUNSET_DATE` están documentadas
en la plantilla backend para Parte IV; todavía no tienen comportamiento implementado.

| Dispositivo | `EXPO_PUBLIC_API_URL` y, si se usa, `EXPO_PUBLIC_WS_URL` |
| --- | --- |
| Emulador Android | `http://10.0.2.2:3000` |
| Celular en la misma Wi-Fi | `http://<IP-LAN-de-la-PC>:3000` |
| Simulador iOS en Mac | `http://localhost:3000` |

Para celular permitir el puerto en el firewall privado; un túnel HTTPS también
sirve. Atlas debe permitir la IP de salida del backend, no la del teléfono.
Socket.IO usa `EXPO_PUBLIC_WS_URL`; si falta o está vacía, usa `EXPO_PUBLIC_API_URL`.
Reiniciar Metro al cambiar `mobile/.env`.

## Configurar Auth0 y Google

1. Crear una aplicación de tipo **Native** y completar dominio/audience en ambos
   entornos; el Client ID público va únicamente en `mobile/.env`.
2. Crear una API con Identifier igual a `AUTH0_AUDIENCE`, algoritmo RS256 y
   **Allow Offline Access** habilitado. Usar tokens de acceso para esta API,
   nunca ID tokens como credenciales del backend.
3. Habilitar Authorization Code y Refresh Token para la aplicación Native;
   activar rotación de refresh tokens y configurar sus vencimientos.
4. Habilitar `google-oauth2` en Authentication > Social y asociarlo a la app.
   Crear/configurar las credenciales OAuth de Google y su pantalla de consentimiento
   siguiendo la [guía oficial de Google en Auth0](https://auth0.com/docs/authenticate/identity-providers/social-identity-providers/google).
   El Google Client Secret queda en Auth0. Agregar las dos cuentas de prueba
   si la aplicación de Google permanece en modo de prueba.
5. En **Allowed Callback URLs** y **Allowed Logout URLs**, registrar estas dos
   URLs reemplazando el dominio (sin barra final):

```text
racha://<tenant>.us.auth0.com/android/com.racha.app/callback
racha://<tenant>.us.auth0.com/ios/com.racha.app/callback
```

El scheme es `racha`, y package/bundle ID es `com.racha.app`. `mobile/app.config.js`
configura el plugin nativo desde el entorno. Cambiar dominio o configuración
nativa exige reconstruir el development build.

Elegimos Auth0 por Universal Login, Google y su SDK con gestión de credenciales
seguras y renovación. El [plan Free](https://auth0.com/pricing) consultado el
2026-11-06 ofrece hasta 25.000 usuarios activos mensuales y conexiones sociales;
funciones y cuotas adicionales dependen del plan, y los endpoints tienen límites
de uso. Revisar precios antes de publicar. El costo técnico es configurar tenant,
callbacks, API y compilar un cliente nativo. No se usa Management API ni se guardan
claves de servicio. Referencias: [SDK nativo](https://github.com/auth0/react-native-auth0)
y [rotación de refresh tokens](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation).

## Compilar y ejecutar

Primero generar un development build con la configuración real. Con Expo Services,
desde `mobile/`, crear en el dashboard de Expo las variables públicas indicadas
arriba dentro del entorno `development` (incluidas las URLs de API/WS) y ejecutar:

```powershell
npx eas-cli@latest build --platform android --profile development
```

Este comando requiere una cuenta Expo y configurar el proyecto al primer uso.
Instalar el APK resultante en el emulador o dispositivo. Para iOS usar un entorno
compatible y un build firmado. `mobile/eas.json` contiene el perfil development.
Como alternativa local, si tenés Android Studio, SDK y un dispositivo virtual
creado (o un teléfono con depuración USB), desde la raíz basta con:

```powershell
npm run android
```

Ese comando carga `mobile/.env`, detecta el SDK en su ubicación habitual (o usa
ANDROID_HOME/ANDROID_SDK_ROOT), prepara Path y usa el JDK de Android Studio si no
hay JAVA_HOME configurado. Expo selecciona/inicia el emulador, compila e instala
el development build y levanta Metro. No cambia las variables permanentes del
sistema. El SDK y el dispositivo virtual deben existir; ver la
[guía de Android de Expo](https://docs.expo.dev/workflow/android-studio-emulator/).

Para levantar ambos servicios, desde la raíz y en terminales separadas:

```powershell
npm run start
# En otra terminal:
npm run android
# Para celular físico, en lugar de android:
npm run mobile
```

`npm run mobile` inicia solo Metro para un development build ya instalado.
`npm run android` también se ocupa de compilar/instalar y usa compilación incremental.

El backend valida entorno, prepara índices, ejecuta seed y completa puntos antiguos
antes de escuchar HTTP. Metro inicia con `--dev-client`: abrir el development build
instalado, no Expo Go. La app ofrece Google, luego alias único si falta, y pestañas
Inicio/Explorar/Crear/Perfil. Cerrar sesión borra las credenciales locales e intenta
cerrar la sesión web de Auth0; no borra la cuenta Google ni los datos de la persona.

## Autenticación y contratos HTTP

### Uso en navegador

Crear una aplicación **Single Page Application** en el mismo tenant Auth0:

1. Habilitar la conexión Google para esa aplicación.
2. Configurar **Allowed Callback URLs**, **Allowed Logout URLs**,
   **Allowed Web Origins** y **Allowed Origins (CORS)** con `http://localhost:8081`.
3. Habilitar Refresh Token Rotation y el grant Refresh Token en la SPA.
   La API debe tener Allow Offline Access habilitado.
4. Agregar a `mobile/.env` `EXPO_PUBLIC_AUTH0_WEB_CLIENT_ID` con el Client ID de
   la SPA. Conservar DOMAIN y AUDIENCE del tenant/API existentes. No usar Client Secret.
5. Opcionalmente configurar `EXPO_PUBLIC_WEB_API_URL` y `EXPO_PUBLIC_WEB_WS_URL`;
   por defecto ambas usan `http://localhost:3000`. No se usa la IP del emulador.
   El backend admite `WEB_ORIGIN` (por defecto `http://localhost:8081`) para CORS.

Desde la raíz, en dos terminales:

```powershell
npm run start
```

```powershell
npm run web
```

Abrir `http://localhost:8081` y permitir la ventana emergente de Google/Auth0.
Detener cualquier Metro previo que esté ocupando ese puerto antes de arrancar.
La web usa Auth0 SPA SDK con Authorization Code + PKCE, tokens en memoria y
renovación coordinada ante 401. No guarda tokens en localStorage ni AsyncStorage.
Al recargar intenta recuperar la sesión con la cookie de Auth0; si el navegador
bloquea cookies de terceros puede pedir ingreso nuevamente. Esto no reemplaza
el almacenamiento seguro del dispositivo exigido para la entrega nativa.
El selector de fechas usa el calendario HTML y las confirmaciones usan el diálogo
del navegador. En producción se requiere HTTPS y configurar el origen real.
Ver [documentación del SDK SPA](https://auth0.com/docs/libraries/auth0-single-page-app-sdk).

`mobile/src/api/cliente.ts` es el único transporte HTTP de la app. Todas las
llamadas llevan `Authorization: Bearer <access-token>`. El SDK guarda credenciales
con Keychain/almacenamiento cifrado de Android, sin AsyncStorage. Renueva al vencer
y, ante 401, fuerza una renovación coordinada y reintenta **una vez**. Si falla,
limpia la sesión y vuelve al ingreso. Una caída de red sin 401 conserva la sesión.
En navegador, `credenciales.web.ts` provee la misma interfaz de sesión con el SDK SPA.

El guard global comprueba firma RS256, emisor, audiencia y vencimiento con JWKS.
Token ausente/inválido/vencido: 401. Actualmente no hay rutas HTTP públicas;
el decorador `Publica` permite marcarlas explícitamente en el futuro.
`x-usuario-id` dejó de aceptarse como identificación. El actor sale del token;
los cuerpos que antes recibían `persona`/`creador` ya no los admiten. Las rutas
con IDs de personas conservadas para lecturas identifican al sujeto consultado.

- `GET /me`: persona autenticada; primer ingreso crea desde `/userinfo` verificado.
- `PATCH /me/alias`: elegir alias único de 3–20 letras/números/guion bajo,
  normalizado a minúsculas. Colisión: 409; no permite reemplazar un alias elegido.
- `PATCH /me`: editar nombre y zona horaria propios.
- `POST /desafios`: datos del desafío, sin `creador`.
- `POST /participaciones`: solo `codigoInvitacion`.
- `POST /desafios/:id/abandonar` y `POST /desafios/:id/cancelar`: sin actor.
- `POST /checkin`: desafío, día opcional, nota/valor, sin `persona`.
- `DELETE /checkin/ultimo`: solo `desafio`.

Sin alias solo se permite consultar `/me` y elegir `/me/alias`; el resto devuelve
403 hasta completar el perfil. Ya no se exponen el registro/listado provisional
ni la edición/eliminación por `/personas/:id`. Las respuestas usan `id`, sin `_id`/`__v`.

La identidad única es `(emisor, sujeto)` de Auth0; también se conserva el proveedor.
Las personas antiguas/seed siguen en la base, sin vinculación automática por email.
Una identidad social crea su persona propia aunque coincida el email. El alias
único usa un índice parcial para permitir perfiles incompletos; el email conserva
unicidad solo entre personas antiguas sin emisor. Al arrancar, una preparación
idempotente reemplaza únicamente los índices antiguos `alias_1`/`email_1` y crea
los declarados; no elimina documentos. Usar un único proceso durante este cambio.

## Recorrido HTTP y comprobaciones

Importar `rachas.postman_collection.json` (formato Collection v2.1). Crear un
entorno privado en Postman con `tokenAna` y `tokenBruno`: access tokens de **dos
cuentas distintas**, para la audience de esta API, nunca ID tokens. Mantener esos
valores locales/sensibles y no exportarlos ni pegarlos en la colección versionada.
`baseUrl` tiene `http://localhost:3000` como ejemplo; ajustar puerto si corresponde.

Ejecutar las cuatro carpetas en orden: identidad/perfil, desafío/métricas,
errores esperados y cierre. Los 32 pedidos guardan IDs/código y comprueban estados.
El desafío se crea programado y se adelanta a hoy mediante PATCH antes del check-in.
Los alias se eligen la primera vez; en posteriores ejecuciones se admite el 409
específico de alias ya elegido. Cada recorrido crea un desafío y lo cancela al final,
conservando los datos; si se interrumpe, revisar el límite de cinco desafíos vigentes.
La colección puede editar nombre/zona de Ana. No renueva tokens ni prueba WebSockets;
para eso usar el login de la app y el catálogo de eventos de este README.

`requests/test.http` usa dos access tokens reales de Google/Auth0 en variables de
entorno del proceso de VS Code: `TEST_AUTH0_TOKEN_ANA` y `TEST_AUTH0_TOKEN_BRUNO`.
La plantilla backend incluye esos nombres vacíos. REST Client usa `$processEnv`
porque el `.http` está en `requests/`; esas variables deben estar disponibles al
iniciar VS Code. No pegar tokens en el archivo versionado. El recorrido consulta
/me, permite elegir alias, crea/unifica sesiones mediante código, registra/deshace,
consulta ranking/inicio/páginas y comprueba 400/401/403/409. Elegir alias solo la
primera vez; si ya existe, omitir esos pedidos. Los datos creados se conservan.

```powershell
npm run build
npm test
npm run test:e2e
npm run test:mobile
npm run typecheck
npm run lint
npm --prefix mobile run export:android
```

Las pruebas usan claves RSA de prueba, transporte/repositorios controlados y
conexiones Socket.IO reales de loopback; no certifican Auth0/Google ni Atlas reales.
El JSON y los scripts de Postman se comprobaron localmente con respuestas de
prueba, incluyendo cobertura de los 22 endpoints; la colección no se ejecutó
con tokens reales ni se validó una importación interactiva en Postman.
La exportación comprueba el bundle JS/Hermes, no la compilación nativa del APK.
La precarga (`npm run seed`) conserva personas y desafíos de demo, pero esas
personas ya no son sesiones seleccionables. Ver [estado y límites](docs/progress.md).

## Tiempo real y alientos

Handshake Socket.IO: `auth: { token: '<mismo-access-token>' }`. Token inválido
rechaza conexión con `connect_error` y código `NO_AUTORIZADO`. Al vencer una
conexión se emite `sesion.vencida` y se desconecta. El cliente renueva y reconecta.
Fallos de infraestructura en el handshake usan `SERVICIO_NO_DISPONIBLE` para
permitir reintentar sin tratar una caída de base de datos como sesión inválida.
Las salas son `desafio:<id>`, solo para participantes activos con alias completo.

| Evento | Emisor → destinatario | Datos |
| --- | --- | --- |
| `desafio.suscribir` | App → servidor | `{ desafioId }`; valida participación y entra a sala |
| `desafio.desuscribir` | App → servidor | `{ desafioId }`; sale de sala |
| `checkin.registrado` | Servidor → sala | Cambio confirmado de check-in |
| `checkin.deshecho` | Servidor → sala | Eliminación confirmada de check-in |
| `ranking.actualizado` | Servidor → sala | Invalidación tras check-in/unión/abandono; consultar ranking real |
| `participante.unido` | Servidor → sala | Unión confirmada |
| `participante.salio` | Servidor → sala | Abandono confirmado; retira las conexiones del participante |
| `desafio.cancelado` | Servidor → sala | Cancelación confirmada |
| `aliento.enviar` | App → servidor | `{ desafioId, destinatarioId, emoji }` |
| `aliento.recibido` | Servidor → sala | `{ desafioId, actor, destinatarioId, emoji, fecha }`; UI solo avisa al destinatario |
| `sesion.vencida` | Servidor → conexión | Sin datos; renovar y reconectar |

Los eventos de cambios/ranking llevan `{ desafioId, actor: { id, nombre }, fecha }`,
fecha ISO. Se emiten después de resolver la escritura/transacción, nunca por un
pedido fallido. Suscribir/desuscribir/alentar responden por acknowledgement:
`{ ok: true }` o `{ ok: false, error: { codigo, mensaje, reintentarEn? } }`.
El exceso de alientos usa `LIMITE_ALIENTO`, con segundos en `reintentarEn`;
otros rechazos usan `OPERACION_RECHAZADA`. El cliente aplica timeout a esos pedidos.

El detalle se suscribe al tomar foco y sale al perderlo. Los cambios actualizan
ranking, progreso e historial con nuevas consultas y muestran un aviso breve.
Tras reconexión o volver del segundo plano, se resuscribe y consulta el estado
real: no se reproducen eventos perdidos. El acceso por explorar a un desafío
ajeno permite leer sus datos, pero muestra el rechazo claro de la sala.

Alientos permitidos: 👏 💪 🔥 🎉 ❤️. Solo entre participantes activos distintos,
con un máximo cada diez segundos por emisor/desafío entre todas sus conexiones.
No se persisten ni se reenvían: sin el detalle abierto no hay entrega posterior,
historial, conteo ni garantía de recepción; los errores vuelven por el mismo canal.
Salas y límite viven en memoria de **un proceso**. Reiniciar lo borra; desplegar
varias instancias requiere un adaptador y un límite compartido antes de escalar.

## Estructura y API de desafíos

- `backend/src/auth/`: JWT, vinculación externa, /me y preparación de índices.
- `backend/src/tiempo-real/`: gateway, salas, alientos y eventos tras persistir.
- `mobile/src/auth/`: SDK y credenciales seguras; `api/`: HTTP y tipos.
- `mobile/src/hooks/`: consultas, acciones y ciclo de conexión del detalle.
- `mobile/src/app/`, `pantallas/`, `components/`: navegación y presentación.

### Tabla completa de endpoints HTTP (Partes I–III)

Todos requieren Bearer. 400: entrada/ID/query inválidos; 401: token ausente,
inválido o vencido; 403: alias pendiente (salvo `/me` y `/me/alias`) o permiso
insuficiente; 404: recurso inexistente; 409: duplicado, cupo/tope, estado incompatible
o conflicto concurrente. También puede haber 503 por indisponibilidad del proveedor
de identidad y 500 ante errores internos; no son errores de validación.

| Verbo | Ruta | Qué hace / respuesta | Éxito | Errores previstos |
| --- | --- | --- | --- | --- |
| GET | `/` | Saludo técnico autenticado; no certifica Atlas | 200 | 401, 403 |
| GET | `/me` | Crea/reconoce y devuelve la persona autenticada | 200 | 401 |
| PATCH | `/me` | Edita nombre y zona horaria propios | 200 | 400, 401, 404 |
| PATCH | `/me/alias` | Elige alias único una sola vez | 200 | 400, 401, 409 |
| GET | `/personas/:id` | Consulta una persona | 200 | 400, 401, 403, 404 |
| POST | `/desafios` | Crea reto y participación creadora; actor del token | 201 | 400, 401, 403, 404, 409 |
| GET | `/desafios` | Página; filtros `estado`/`categoria`, `pagina`/`limite` por query | 200 | 400, 401, 403 |
| GET | `/desafios/persona/:personaId` | Desafíos por participación, también históricos | 200 | 400, 401, 403, 404 |
| GET | `/desafios/:id` | Datos del reto y estado calculado | 200 | 400, 401, 403, 404 |
| PATCH | `/desafios/:id` | Edita un reto programado; solo creador | 200 | 400, 401, 403, 404, 409 |
| POST | `/desafios/:id/cancelar` | Cancela como creador, sin actor en body | 201 | 400, 401, 403, 404, 409 |
| POST | `/participaciones` | Se une con `codigoInvitacion` | 201 | 400, 401, 403, 404, 409 |
| POST | `/desafios/:desafioId/abandonar` | Abandona la persona autenticada | 201 | 400, 401, 403, 404 |
| GET | `/desafios/:desafioId/participaciones` | Participantes activos con persona poblada | 200 | 400, 401, 403, 404 |
| POST | `/checkin` | Registra hoy/ayer, nota/valor opcionales y puntos | 201 | 400, 401, 403, 404, 409 |
| DELETE | `/checkin/ultimo` | Deshace el último propio si es de hoy; body `{ desafio }` | 200 | 400, 401, 403, 404, 409 |
| GET | `/checkin/desafio/:desafioId` | Página de historial del reto | 200 | 400, 401, 403, 404 |
| GET | `/checkin/desafio/:desafioId/persona/:personaId` | Página de historial de una persona | 200 | 400, 401, 403, 404 |
| GET | `/desafios/:desafioId/ranking` | Ranking y ganador si finalizó | 200 | 400, 401, 403, 404 |
| GET | `/desafios/:desafioId/personas/:personaId/progreso` | Puntos, rachas, posición y acciones permitidas | 200 | 400, 401, 403, 404 |
| GET | `/personas/:personaId/inicio` | Desafíos vigentes con progreso y check-in de hoy | 200 | 400, 401, 403, 404 |
| GET | `/personas/:personaId/resultados` | Página de finalizados, resultado propio y ganador | 200 | 400, 401, 403, 404 |

Los códigos comunes 500/503 aplican a todas las filas cuando falla infraestructura.
No hay rutas `/v1` ni controles de versión de app implementados todavía.

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

Web (Parte III): bundle Expo generado, render en Chrome headless y mensaje de
configuración faltante comprobados. TypeScript, lint, 18 pruebas móviles y 19 e2e
backend correctos; incluyen CORS HTTP y handshake Socket.IO por polling con token.
Google real, recuperación tras recargar y recorrido con dos cuentas en navegador
no fueron verificados por el agente. El autor configuró la SPA y reportó resuelto
el preflight CORS tras reiniciar el backend; no se acredita un recorrido completo.

Parte III: compilación backend, TypeScript móvil, lint, pruebas de JWT/HTTP y
Socket.IO de loopback, y exportación Android/Hermes con dominio de ejemplo.
No se completó todavía el recorrido nativo de Google con dos cuentas. El último
intento detectó el emulador API 36 y superó el merge del manifiesto con minSdk 26,
pero falló al compilar Reanimated con Ninja (`mkdir: No such file or directory`).
La prueba posterior con una unidad virtual corta también falló: Autolinking
mezcló rutas de C: y de la unidad virtual y Codegen rechazó raíces distintas.
Actualizar el Ninja local a 1.13.2 tampoco resolvió el fallo de rutas largas;
Windows todavía tiene LongPathsEnabled deshabilitado. El build nativo sigue bloqueado.
Eso no acredita instalación ni ejecución del development build. El historial y los
resultados concretos están en [docs/progress.md](docs/progress.md).

Las siguientes pruebas corresponden a Parte II con Expo Go; no certifican el
login nativo nuevo de Parte III. Ese recorrido queda pendiente de configuración.

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

- `personas.alias` único cuando existe; `personas.email` único entre perfiles
  antiguos sin emisor. Identidad externa única por `emisor` y `sujeto`.
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

- Desarrollo: copiar `backend/.env.example` a `backend/.env` y completar
  `MONGODB_URI=mongodb+srv://<usuario>:<contraseña>@<cluster>/<base>`.
  Los `.env` están en `.gitignore` y nunca se commitean.
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

## Entrega y versionado

```text
rachas/
├── backend/
│   └── .env.example
├── mobile/
│   └── .env.example
├── docs/
│   ├── compatibilidad.md
│   ├── tracking-plan.md
│   ├── postmortem.md
│   └── progress.md
├── rachas.postman_collection.json
└── README.md
```

Los tres documentos requeridos están presentes: [compatibilidad](docs/compatibilidad.md),
[tracking plan](docs/tracking-plan.md) y [postmortem](docs/postmortem.md).
Declaran su alcance real: Parte IV no realizada. Su presencia cumple la estructura,
pero no acredita versionado, telemetría, distribución ni cumplimiento de Parte IV.

Tags anotados de los cortes históricos: `parte-1` en `f8e2914`, `parte-2` en
`d2aafdd` y `parte-3` en el commit final de documentación de esta entrega.
Los tags identifican cortes de código; no certifican pruebas pendientes. Los cortes
antiguos conservan su documentación original. No se crean `parte-4` ni `app-1.0.0`;
el campo package.version 1.0.0 existente no representa una entrega de Parte IV.
No se reescribe historial ni se usa force push. Commits y tags se preparan localmente.

Antes de cada commit revisar archivos nuevos/staged e historial por posibles
secretos, incluidos tokens en exports de Postman. Si una credencial real ya fue
publicada, debe rotarse; borrarla del último archivo no la elimina del historial.
Las plantillas contienen únicamente ejemplos o campos vacíos. Los IDs públicos
de Auth0 y las URLs de ejemplo no son credenciales secretas.

Subir el enlace del repositorio con acceso para la cátedra en la actividad de cada
parte de WebCampus. Fecha y hora límite, permisos del repositorio y envío efectivo
deben comprobarse allí; no se verificaron ni se realizó el envío desde este trabajo.

