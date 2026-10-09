<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

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
con 20 participantes durante 90 días generaría miles de registros
embebidos) y permite consultar historiales, rankings y participaciones
con filtros específicos e índices propios.

### 2. Por qué referencias en lugar de embebidos

- Las participaciones se conservan como historial tras el abandono y el
  cupo activo no limita el historial: embeberlas mezclaría activos con
  históricos en el mismo documento.
- Los registros crecen con el tiempo (uno por día y persona) y necesitan
  su índice único `{ persona, desafio, dia }`: embebidos obligarían a
  reescribir el desafío en cada registro.
- Se evita duplicar los datos de la persona en cada desafío: las
  relaciones son `Desafio.creador → Persona`, `Participacion.persona →
  Persona`, `Participacion.desafio → Desafio`,
  `RegistroCumplimiento.persona → Persona` y
  `RegistroCumplimiento.desafio → Desafio`.

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
  impide dos registros del mismo día.
- Índices secundarios justificados: `{ desafio, estado }` (cupo activo y
  ranking) y `{ desafio, dia }` (historial y ranking por día).

### 6. Reglas que requieren lógica de servicios y concurrencia

Los índices no bastan; estas reglas viven en los servicios:

- Tope de 5 desafíos vigentes por persona (conteo por aplicación; la
  concurrencia exacta requeriría contadores atómicos).
- Cupo de activos y tope de vigentes: conteo + inserción dentro de la
  misma transacción (`withTransaction`).
- Colisiones de `codigoInvitacion`: reintento ante error de clave
  duplicada 11000, no consulta previa (ventana de carrera).
- Unión solo a desafíos programados/activos; edición de fechas/cupos
  solo en programados; cupo nunca bajo activos; cancelación solo del
  creador en programados/activos; el creador no abandona; registros solo
  hoy/ayer dentro del intervalo y con participación activa; deshacer solo
  el último registro propio del día actual.

### 7. Configuración de `MONGODB_URI` sin publicar secretos

- Desarrollo: copiar `backend/.env.example` a `backend/.env` y completar
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
referencia. La zona individual solo determina el `dia` de cada registro
de cumplimiento. El cambio de día sigue esa zona de referencia.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observer](https://observer.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
