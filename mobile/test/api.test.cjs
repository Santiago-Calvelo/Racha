const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Aísla configuración y transporte por prueba; usa el código TypeScript real.
function cargarApi(fetch, opciones = {}) {
  const cache = new Map();
  const entorno = {
    EXPO_PUBLIC_API_URL: 'http://api.test',
    ...opciones.entorno,
  };
  function cargar(nombre) {
    const archivo = path.resolve(__dirname, '../src/api', `${nombre}.ts`);
    if (cache.has(archivo)) return cache.get(archivo);
    const modulo = { exports: {} };
    cache.set(archivo, modulo.exports);
    const { outputText } = ts.transpileModule(
      fs.readFileSync(archivo, 'utf8'),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    );
    vm.runInNewContext(
      outputText,
      {
        exports: modulo.exports,
        module: modulo,
        require: (relativo) => cargar(relativo),
        process: { env: entorno },
        fetch,
        AbortController,
        TypeError,
        setTimeout: opciones.setTimeout ?? setTimeout,
        clearTimeout,
      },
      { filename: archivo },
    );
    return modulo.exports;
  }
  cargar('cliente').configurarAutenticacion(opciones.token ?? (async () => 'token-prueba'), opciones.vencida ?? (async () => {}));
  return cargar;
}
const json = (datos, status = 200) => ({
  ok: status < 400,
  status,
  text: async () => JSON.stringify(datos),
});
const persona = {
  id: '0123456789abcdef01234567',
  nombre: 'Ana',
  alias: 'ana',
  email: 'ana@example.com',
  zonaHoraria: 'UTC',
};

test('envia Bearer en todos los metodos y usa /me para la persona autenticada', async () => {
  const pedidos = [];
  const api = cargarApi(async (url, init) => { pedidos.push({ url, ...init }); return json(persona); });
  await api('personas').obtenerMe();
  await api('personas').elegirAlias('ana');
  await api('personas').editarPersona(persona.id, { nombre: 'Otro' });
  assert.deepEqual(pedidos.map(p => p.method), ['GET', 'PATCH', 'PATCH']);
  assert.ok(pedidos.every(p => p.headers.Authorization === 'Bearer token-prueba'));
  assert.ok(pedidos.every(p => !('x-usuario-id' in p.headers)));
  assert.equal(pedidos[2].url, 'http://api.test/me');
  assert.equal(JSON.parse(pedidos[2].body).nombre, 'Otro');
});

test('los recursos omiten al actor en cuerpos y rutas', async () => {
  const pedidos = [];
  const api = cargarApi(async (url, init) => {
    pedidos.push({ url, ...init });
    if (url.endsWith('/desafios'))
      return json({
        id: 'reto',
        nombre: 'Caminar',
        categoria: 'SALUD',
        fechaInicio: '2026-10-23',
        fechaFin: '2026-10-29',
        maximoParticipantes: 10,
        codigoInvitacion: 'DEMOA1',
        creador: persona.id,
        fechaCancelacion: null,
      });
    if (url.includes('/checkin'))
      return json({
        id: 'registro',
        persona: persona.id,
        desafio: 'reto',
        dia: '2026-10-23',
        puntos: 10,
      });
    return json({
      id: 'participacion',
      persona: persona.id,
      desafio: 'reto',
      estado: 'ACTIVA',
      fechaIngreso: '2026-10-23',
      fechaAbandono: null,
    });
  });
  await api('desafios').crearDesafio({
    nombre: 'Caminar',
    categoria: 'SALUD',
    fechaInicio: '2026-10-23',
    fechaFin: '2026-10-29',
  });
  await api('participaciones').unirseADesafio('DEMOA1');
  await api('participaciones').abandonarDesafio('reto');
  await api('checkins').registrarCheckin({ desafio: 'reto' });
  await api('checkins').deshacerCheckin('reto');
  assert.equal(JSON.parse(pedidos[0].body).creador, undefined);
  for (const i of [1, 3, 4])
    assert.equal(JSON.parse(pedidos[i].body).persona, undefined);
  assert.ok(
    pedidos[2].url.endsWith('/desafios/reto/abandonar'),
  );
  assert.ok(pedidos.every((p) => p.headers.Authorization === 'Bearer token-prueba'));
});

test('propaga status y mensajes de error del back, incluidos errores no JSON', async () => {
  for (const status of [400, 403, 404, 409]) {
    const api = cargarApi(async () =>
      json({ message: ['Dato inválido', 'Otra regla'] }, status),
    );
    await assert.rejects(
      api('personas').obtenerMe(),
      (e) => e.status === status && e.message.includes('Otra regla'),
    );
  }
  const api = cargarApi(async () => ({
    ok: false,
    status: 503,
    text: async () => 'Unavailable',
  }));
  await assert.rejects(
    api('personas').obtenerMe(),
    (e) => e.status === 503,
  );
});

test('rechaza respuestas incompatibles y acepta listas vacías', async () => {
  const api = cargarApi(async () => json([{ id: 'incompleto' }]));
  await assert.rejects(api('personas').obtenerMe(), /formato inválido/);
  const vacio = cargarApi(async () =>
    json({ items: [], pagina: 1, limite: 20, total: 0 }),
  );
  assert.equal((await vacio('desafios').listarDesafios()).items.length, 0);
});

test('no envia pedidos sin URL o sin sesion', async () => {
  let enviados = 0;
  const transporte = async () => { enviados++; return json(persona); };
  const sinUrl = cargarApi(transporte, { entorno: { EXPO_PUBLIC_API_URL: '' } });
  await assert.rejects(sinUrl('personas').obtenerMe(), /Configur/);
  let vencida = 0;
  const sinSesion = cargarApi(transporte, { token: async () => { throw new Error('sin sesion'); }, vencida: async () => { vencida++; } });
  await assert.rejects(sinSesion('personas').obtenerMe(), /Volv/);
  assert.equal(enviados, 0);
  assert.equal(vencida, 1);
});

test('permite separar Socket.IO de HTTP y conserva la URL de API como respaldo', () => {
  const separado = cargarApi(async () => json(persona), { entorno: { EXPO_PUBLIC_WS_URL: ' https://socket.test/ ' } });
  assert.equal(separado('cliente').baseUrlWs(), 'https://socket.test');
  assert.equal(separado('cliente').baseUrlApi(), 'http://api.test');
  const respaldo = cargarApi(async () => json(persona), { entorno: { EXPO_PUBLIC_WS_URL: ' ' } });
  assert.equal(respaldo('cliente').baseUrlWs(), 'http://api.test');
});

test('renueva una vez ante 401 y reintenta con el nuevo token', async () => {
  const tokens = [];
  let renovaciones = 0;
  const api = cargarApi(async (_url, init) => {
    tokens.push(init.headers.Authorization);
    return tokens.length === 1 ? json({ message: 'Vencido' }, 401) : json(persona);
  }, { token: async forzar => { if (forzar) renovaciones++; return forzar ? 'nuevo' : 'viejo'; } });
  await api('personas').obtenerMe();
  assert.deepEqual(tokens, ['Bearer viejo', 'Bearer nuevo']);
  assert.equal(renovaciones, 1);
});

test('si falla renovar o el reintento vuelve a dar 401, cierra la sesion sin bucles', async () => {
  for (const falla of [true, false]) {
    let pedidos = 0, cierres = 0;
    const api = cargarApi(async () => { pedidos++; return json({ message: 'Sesion invalida' }, 401); }, {
      token: async forzar => { if (forzar && falla) throw new Error('refresh invalido'); return 'token'; },
      vencida: async () => { cierres++; },
    });
    await assert.rejects(api('personas').obtenerMe());
    assert.equal(pedidos, falla ? 1 : 2);
    assert.equal(cierres, 1);
  }
});

test('distingue caída de red, timeout y cancelación del solicitante', async () => {
  const red = cargarApi(async () => {
    throw new TypeError('offline');
  });
  await assert.rejects(red('personas').obtenerMe(), /No se pudo conectar/);
  const esperar = (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      const cancelar = () => reject(new Error('cancelado'));
      if (signal.aborted) cancelar();
      else signal.addEventListener('abort', cancelar, { once: true });
    });
  const timeout = cargarApi(esperar, {
    setTimeout: (callback) => setTimeout(callback, 5),
  });
  await assert.rejects(timeout('personas').obtenerMe(), /diez segundos/);
  const cancelacion = cargarApi(esperar);
  const controller = new AbortController();
  const pendiente = cancelacion('personas').obtenerMe(controller.signal);
  controller.abort();
  await assert.rejects(pendiente, /cancelado/);
});

test('valida formularios con límites reales y fechas inclusivas', () => {
  const api = cargarApi(async () => json([]));
  const v = api('../validaciones');
  const hoy = v.diaZona('America/Argentina/Buenos_Aires');
  const perfil = { nombre: 'Ana', alias: 'ana', email: 'ana@example.com', zonaHoraria: 'UTC' };
  assert.equal(Object.keys(v.validarPerfil(perfil)).length, 0);
  assert.equal(Object.keys(v.validarPerfil({ ...perfil, nombre: '', alias: 'a', email: 'mal', zonaHoraria: '+03:00' })).length, 4);
  const desafio = { nombre: 'Caminar', categoria: 'SALUD', fechaInicio: hoy, fechaFin: v.moverDia(hoy, 2), maximoParticipantes: 2 };
  assert.equal(Object.keys(v.validarDesafio(desafio, 3)).length, 0);
  assert.ok(v.validarDesafio({ ...desafio, maximoParticipantes: 21 }, 91).cupo);
  assert.ok(v.validarDesafio({ ...desafio, fechaInicio: v.moverDia(hoy, -1) }, 30).fechaInicio);
  assert.equal(v.moverDia('2026-10-01', 2), '2026-10-03');
});
