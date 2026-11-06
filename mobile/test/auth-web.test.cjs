const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function cargar(gestor = {}) {
  let opciones;
  const eventos = [];
  class Auth0Client {
    constructor(config) { opciones = config; }
    loginWithPopup = async config => { eventos.push(config); };
    getTokenSilently = gestor.token || (async () => 'token');
    checkSession = async () => {};
    isAuthenticated = async () => true;
    logout = async config => { eventos.push(config); };
  }
  const modulo = { exports: {} };
  const { outputText } = ts.transpileModule(fs.readFileSync(require.resolve('../src/auth/credenciales.web.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, {
    exports: modulo.exports, module: modulo,
    require: () => ({ Auth0Client, PopupCancelledError: class extends Error {}, PopupTimeoutError: class extends Error {} }),
    window: { location: { origin: 'http://localhost:8081' } },
    process: { env: { EXPO_PUBLIC_AUTH0_DOMAIN: 'example.auth0.com', EXPO_PUBLIC_AUTH0_WEB_CLIENT_ID: 'spa', EXPO_PUBLIC_AUTH0_AUDIENCE: 'https://racha.api' } },
  });
  return { auth: modulo.exports, eventos, opciones: () => opciones };
}
test('web usa el cliente SPA, tokens en memoria, Google y retorno al origen', async () => {
  const { auth, eventos, opciones } = cargar();
  await auth.ingresarGoogle();
  assert.equal(opciones().clientId, 'spa');
  assert.equal(opciones().cacheLocation, 'memory');
  assert.equal(opciones().useRefreshTokens, true);
  assert.equal(opciones().authorizationParams.redirect_uri, 'http://localhost:8081');
  assert.equal(eventos[0].authorizationParams.connection, 'google-oauth2');
  await auth.cerrarSesion();
  assert.equal(eventos.at(-1).logoutParams.returnTo, 'http://localhost:8081');
});
test('web comparte renovaciones y no renueva otra vez un token ya reemplazado', async () => {
  let llamadas = 0, liberar;
  const { auth } = cargar({ token: async options => {
    llamadas++;
    assert.equal(options.cacheMode, 'off');
    await new Promise(resolve => { liberar = resolve; });
    return 'nuevo';
  } });
  const a = auth.obtenerToken(true, 'viejo');
  const b = auth.obtenerToken(true, 'viejo');
  liberar();
  assert.deepEqual(await Promise.all([a, b]), ['nuevo', 'nuevo']);
  assert.equal(await auth.obtenerToken(true, 'viejo'), 'nuevo');
  assert.equal(llamadas, 1);
});
test('invalidar sesión espera la renovación y rechaza el token que llega tarde', async () => {
  let liberar;
  const { auth, eventos } = cargar({ token: () => new Promise(resolve => { liberar = resolve; }) });
  const renovacion = auth.obtenerToken();
  const cerrado = auth.borrarCredenciales();
  liberar('tardio');
  await assert.rejects(renovacion, /sesión cambió/);
  await cerrado;
  assert.equal(eventos.at(-1).openUrl, false);
});
