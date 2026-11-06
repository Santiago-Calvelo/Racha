const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('el detalle resuscribe y consulta tras reconectar, procesa cambios y limpia al salir', async () => {
  let limpiar, cambiarEstado, renovaciones = 0, consultas = 0;
  const enviados = [], handlers = {}, timers = new Map();
  let timerId = 0;
  const socket = {
    connected: false,
    on: (evento, fn) => { handlers[evento] = fn; },
    timeout: () => socket,
    emit: (evento, datos, ack) => { enviados.push({ evento, datos }); ack?.(null, { ok: true }); },
    connect: () => { socket.connected = true; handlers.connect?.(); },
    disconnect: () => { socket.connected = false; handlers.disconnect?.(); },
    removeAllListeners: () => { Object.keys(handlers).forEach(k => delete handlers[k]); },
  };
  const mocks = {
    react: { useCallback: f => f, useRef: v => ({ current: v }), useState: v => [v, () => {}] },
    'react-native': { AppState: { addEventListener: (_e, fn) => { cambiarEstado = fn; return { remove: () => { cambiarEstado = null; } }; } } },
    'expo-router': { useFocusEffect: fn => { limpiar = fn(); } },
    'socket.io-client': { io: url => { assert.equal(url, 'http://socket.test'); return socket; } },
    '../api/cliente': { baseUrlWs: () => 'http://socket.test' },
    '../auth/credenciales': { obtenerToken: async forzar => { if (forzar) renovaciones++; return 'token'; } },
  };
  const modulo = { exports: {} };
  const { outputText } = ts.transpileModule(fs.readFileSync(require.resolve('../src/hooks/useTiempoReal.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, {
    exports: modulo.exports, module: modulo, require: nombre => mocks[nombre],
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
  });
  modulo.exports.useTiempoReal('reto', 'ana', () => consultas++, async () => {});
  assert.equal(enviados[0].evento, 'desafio.suscribir');
  assert.equal(consultas, 1);
  handlers['checkin.registrado']({ desafioId: 'reto', actor: { id: 'bruno', nombre: 'Bruno' } });
  for (const fn of timers.values()) fn();
  assert.equal(consultas, 2);
  cambiarEstado('background');
  cambiarEstado('active');
  assert.equal(enviados.filter(e => e.evento === 'desafio.suscribir').length, 2);
  assert.equal(consultas, 4);
  handlers['sesion.vencida']();
  await new Promise(r => setImmediate(r));
  assert.equal(renovaciones, 1);
  assert.equal(enviados.filter(e => e.evento === 'desafio.suscribir').length, 3);
  limpiar();
  assert.equal(enviados.at(-1).evento, 'desafio.desuscribir');
  assert.equal(socket.connected, false);
  assert.equal(cambiarEstado, null);
  assert.equal(timers.size, 0);
});
