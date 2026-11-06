const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function cargarCredenciales(gestor) {
  const eventos = [];
  class Auth0 {
    constructor() {
      this.credentialsManager = gestor;
      this.webAuth = {
        authorize: async (p, o) => { eventos.push({ p, o }); return { accessToken: 'login', refreshToken: 'refresh' }; },
        clearSession: async () => { eventos.push('logout'); },
      };
    }
  }
  const sdk = { default: Auth0, __esModule: true, WebAuthError: class extends Error {}, WebAuthErrorCodes: { USER_CANCELLED: 'USER_CANCELLED', NETWORK_ERROR: 'NETWORK_ERROR' } };
  const modulo = { exports: {} };
  const { outputText } = ts.transpileModule(fs.readFileSync(require.resolve('../src/auth/credenciales.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  vm.runInNewContext(outputText, {
    exports: modulo.exports, module: modulo,
    require: nombre => nombre === 'react-native-auth0' ? sdk : { Platform: { OS: 'android' } },
    process: { env: { EXPO_PUBLIC_AUTH0_DOMAIN: 'test.auth0.com', EXPO_PUBLIC_AUTH0_CLIENT_ID: 'cliente', EXPO_PUBLIC_AUTH0_AUDIENCE: 'https://racha.api' } },
  });
  return { ...modulo.exports, eventos };
}
test('Google solicita offline_access y guarda credenciales exclusivamente con el gestor seguro', async () => {
  let guardadas;
  const auth = cargarCredenciales({ saveCredentials: async c => { guardadas = c; } });
  await auth.ingresarGoogle();
  assert.equal(guardadas.refreshToken, 'refresh');
  assert.equal(auth.eventos[0].p.connection, 'google-oauth2');
  assert.ok(auth.eventos[0].p.scope.includes('offline_access'));
  assert.equal(auth.eventos[0].o.customScheme, 'racha');
});
test('dos 401 concurrentes comparten una sola renovacion y los rechazos antiguos usan el token nuevo', async () => {
  let llamadas = 0, liberar;
  const auth = cargarCredenciales({ getCredentials: async (_scope, _ttl, _params, forzar) => {
    llamadas++;
    assert.equal(forzar, true);
    await new Promise(r => { liberar = r; });
    return { accessToken: 'nuevo' };
  } });
  const a = auth.obtenerToken(true, 'viejo');
  const b = auth.obtenerToken(true, 'viejo');
  liberar();
  assert.deepEqual(await Promise.all([a, b]), ['nuevo', 'nuevo']);
  assert.equal(await auth.obtenerToken(true, 'viejo'), 'nuevo');
  assert.equal(llamadas, 1);
});
test('un 401 que llega durante una lectura de credenciales fuerza una renovacion posterior', async () => {
  let liberar, llamadas = 0;
  const auth = cargarCredenciales({ getCredentials: async (_s, _t, _p, forzar) => {
    llamadas++;
    if (!forzar) { await new Promise(r => { liberar = r; }); return { accessToken: 'viejo' }; }
    return { accessToken: 'nuevo' };
  } });
  const lectura = auth.obtenerToken();
  const rechazada = auth.obtenerToken(true, 'viejo');
  liberar();
  assert.equal(await lectura, 'viejo');
  assert.equal(await rechazada, 'nuevo');
  assert.equal(llamadas, 2);
});
test('cerrar sesion espera la renovacion en curso y borra lo que el SDK haya persistido', async () => {
  let liberar, almacen = 'viejo';
  const auth = cargarCredenciales({
    getCredentials: async () => { await new Promise(r => { liberar = r; }); almacen = 'nuevo'; return { accessToken: 'nuevo' }; },
    clearCredentials: async () => { almacen = null; },
  });
  const pendiente = auth.obtenerToken(true).catch(e => e);
  const cerrar = auth.borrarCredenciales();
  liberar();
  assert.ok((await pendiente).message.includes('cambi'));
  await cerrar;
  assert.equal(almacen, null);
});
