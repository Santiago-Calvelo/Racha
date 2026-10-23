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
    EXPO_PUBLIC_USUARIO_INICIAL_ID: '0123456789abcdef01234567',
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

test('agrega identidad y JSON en todos los métodos y refleja el cambio de persona', async () => {
  const pedidos = [];
  const api = cargarApi(async (url, init) => {
    pedidos.push({ url, ...init });
    return json(persona);
  });
  const personas = api('personas');
  await personas.obtenerPersona(persona.id);
  await personas.crearPersona({
    nombre: 'Ana',
    alias: 'ana',
    email: persona.email,
  });
  api('cliente').seleccionarUsuario('abcdef0123456789abcdef01');
  await personas.editarPersona(persona.id, { nombre: 'Otro' });
  await personas.eliminarPersona(persona.id);
  assert.deepEqual(
    pedidos.map((p) => p.method),
    ['GET', 'POST', 'PATCH', 'DELETE'],
  );
  assert.equal(pedidos[0].headers['x-usuario-id'], persona.id);
  assert.equal(pedidos[2].headers['x-usuario-id'], 'abcdef0123456789abcdef01');
  assert.equal(pedidos[1].headers['Content-Type'], 'application/json');
  assert.equal(JSON.parse(pedidos[2].body).nombre, 'Otro');
});

test('los recursos envían a la persona activa en cuerpos y rutas', async () => {
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
  assert.equal(JSON.parse(pedidos[0].body).creador, persona.id);
  for (const i of [1, 3, 4])
    assert.equal(JSON.parse(pedidos[i].body).persona, persona.id);
  assert.ok(
    pedidos[2].url.includes(`/participaciones/${persona.id}/abandonar`),
  );
  assert.ok(pedidos.every((p) => p.headers['x-usuario-id'] === persona.id));
});

test('propaga status y mensajes de error del back, incluidos errores no JSON', async () => {
  for (const status of [400, 403, 404, 409]) {
    const api = cargarApi(async () =>
      json({ message: ['Dato inválido', 'Otra regla'] }, status),
    );
    await assert.rejects(
      api('personas').listarPersonas(),
      (e) => e.status === status && e.message.includes('Otra regla'),
    );
  }
  const api = cargarApi(async () => ({
    ok: false,
    status: 503,
    text: async () => 'Unavailable',
  }));
  await assert.rejects(
    api('personas').listarPersonas(),
    (e) => e.status === 503,
  );
});

test('rechaza respuestas incompatibles y acepta listas vacías', async () => {
  const api = cargarApi(async () => json([{ id: 'incompleto' }]));
  await assert.rejects(api('personas').listarPersonas(), /formato inválido/);
  const vacio = cargarApi(async () =>
    json({ items: [], pagina: 1, limite: 20, total: 0 }),
  );
  assert.equal((await vacio('desafios').listarDesafios()).items.length, 0);
});

test('no envía pedidos sin URL o identidad inicial válida', async () => {
  for (const entorno of [
    { EXPO_PUBLIC_USUARIO_INICIAL_ID: '' },
    { EXPO_PUBLIC_API_URL: '' },
  ]) {
    let enviados = 0;
    const api = cargarApi(
      async () => {
        enviados++;
        return json([]);
      },
      { entorno },
    );
    await assert.rejects(api('personas').listarPersonas(), /Configurá/);
    assert.equal(enviados, 0);
  }
});

test('distingue caída de red, timeout y cancelación del solicitante', async () => {
  const red = cargarApi(async () => {
    throw new TypeError('offline');
  });
  await assert.rejects(red('personas').listarPersonas(), /No se pudo conectar/);
  const esperar = (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      const cancelar = () => reject(new Error('cancelado'));
      if (signal.aborted) cancelar();
      else signal.addEventListener('abort', cancelar, { once: true });
    });
  const timeout = cargarApi(esperar, {
    setTimeout: (callback) => setTimeout(callback, 5),
  });
  await assert.rejects(timeout('personas').listarPersonas(), /diez segundos/);
  const cancelacion = cargarApi(esperar);
  const controller = new AbortController();
  const pendiente = cancelacion('personas').listarPersonas(controller.signal);
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
