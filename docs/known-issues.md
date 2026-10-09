# Problemas conocidos

Hechos verificados el 09/10/2026 sobre `backend/`. Indicar siempre la fecha y la comprobación ejecutada.

## 1. Los tests requieren `--experimental-vm-modules`

- **Síntoma:** `npm test` falla con `Must use import to load ES Module: node_modules/@nestjs/testing/index.js`.
- **Causa:** Nest 12 (`@nestjs/testing`, `@nestjs/core`, `@nestjs/common`) se publica solo como ESM (`"type": "module"`). Jest 30 solo activa el `require(esm)` nativo si `vm.SourceTextModule` existe, y ese objeto solo está disponible con `--experimental-vm-modules`.
- **Comando verificado:** `NODE_OPTIONS=--experimental-vm-modules npm test` → 3 suites / 29 tests en verde.
- **Pendiente:** decidir si se fija en los scripts de `package.json` (p. ej. `node --experimental-vm-modules node_modules/jest/bin/jest.js`) para que `npm test` funcione sin env var. **No decidido todavía.**

## 2. TypeScript 6 exige `rootDir` explícito (TS5011)

- **Síntoma:** toda suite falla al compilar con `error TS5011: The common source directory of 'tsconfig.json' is './src...'`.
- **Causa:** `tsconfig.json` no define `rootDir` y TypeScript 6 lo exige para calcular el layout de salida.
- **Solución aplicada (acotada):** `jest.config.ts` y `test/jest-e2e.json` inyectan `tsconfig: { rootDir: '.' }` solo para la compilación de tests. `tsconfig.json` y `tsconfig.build.json` no se tocaron (`nest build` usa `rootDir: ./src`).

## 3. El e2e no cierra Jest sin `--forceExit`

- **Síntoma:** `npm run test:e2e` pasa el test pero Jest queda colgado (`Jest did not exit one second after...`) por el worker de `@nestjs/observe` reiniciándose con las credenciales placeholder (`YOUR_APP_KEY`).
- **Comando verificado:** `npx jest --config ./test/jest-e2e.json --forceExit` → 1 test en verde y proceso termina.
- **Relacionado:** el módulo `ObserveModule` en `src/app.module.ts` tiene credenciales de ejemplo; no usarlas en entornos reales.

## 4. `prettier --check` falla en todo el repo (deriva CRLF)

- Todos los `.ts` del proyecto (incluidos los generados por el CLI de Nest, sin modificar) están en CRLF, y Prettier 3 exige LF por defecto.
- **No se ejecutó** `npm run format`: reescribiría archivos ajenos a cualquier tarea. Verificar con `--list-different` antes de atribuir una falla de formato a un cambio nuevo.

## 5. Módulo `personas`: decisiones vigentes

- Almacenamiento **en memoria** (no hay capa de persistencia en el proyecto).
- Validación **manual en el servicio** (sin `class-validator`): decisión del programador del 09/10/2026, sin dependencias nuevas.
- Unicidad de `alias` y `email` **case-insensitive** (suposición del agente, no confirmada por el programador).
- Zona horaria ausente o vacía ⇒ `America/Argentina/Buenos_Aires`. Válida si la acepta `Intl.DateTimeFormat` y no es un offset (`+05:30`).
