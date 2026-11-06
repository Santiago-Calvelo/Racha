import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { io, type Socket } from 'socket.io-client';
import { Types } from 'mongoose';
import type { AddressInfo } from 'node:net';
import { TokenService } from '../src/auth/token.service';
import { PersonaAuthService } from '../src/auth/persona-auth.service';
import { Participacion } from '../src/participaciones/entities/participacion.entity';
import { TiempoRealGateway } from '../src/tiempo-real/tiempo-real.gateway';
import { TiempoRealService } from '../src/tiempo-real/tiempo-real.service';

interface Ack { ok: boolean; error?: { codigo: string; mensaje: string } }
describe('Socket.IO real: handshake, salas y alientos', () => {
  let app: INestApplication;
  let tiempo: TiempoRealService;
  let url: string;
  const sockets: Socket[] = [];
  const desafioId = new Types.ObjectId().toHexString();
  const ana = new Types.ObjectId().toHexString();
  const bruno = new Types.ObjectId().toHexString();
  const ajeno = new Types.ObjectId().toHexString();
  const activos = new Set([ana, bruno]);
  const conectar = (token?: string) => {
    const socket = io(url, { auth: { token }, reconnection: false, forceNew: true, transports: ['websocket'] });
    sockets.push(socket);
    return socket;
  };
  const conectado = (s: Socket) => new Promise<void>((resolve, reject) => { s.once('connect', resolve); s.once('connect_error', reject); });
  const pedido = (s: Socket, evento: string, datos: object): Promise<Ack> => new Promise((resolve, reject) => {
    s.timeout(1500).emit(evento, datos, (error: Error | null, respuesta: Ack) => error ? reject(error) : resolve(respuesta));
  });
  const recibir = <T>(s: Socket, evento: string): Promise<T> => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No llegó ${evento}`)), 2000);
    s.once(evento, (datos: T) => { clearTimeout(timer); resolve(datos); });
  });
  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      providers: [TiempoRealGateway, TiempoRealService,
        { provide: TokenService, useValue: { verificar: async (token: string) => {
          if (![ana, bruno, ajeno].includes(token)) throw new UnauthorizedException('Token no válido');
          return { sujeto: token, expira: Math.floor(Date.now() / 1000) + 60 };
        } } },
        { provide: PersonaAuthService, useValue: { resolver: async (identidad: { sujeto: string }) => ({ _id: identidad.sujeto, alias: 'alias', nombre: identidad.sujeto === ana ? 'Ana' : 'Bruno' }) } },
        { provide: getModelToken(Participacion.name), useValue: { exists: async (f: { persona: string; desafio: string }) => activos.has(f.persona) && f.desafio === desafioId ? { _id: 'participacion' } : null } },
      ],
    }).compile();
    app = modulo.createNestApplication();
    await app.listen(0, '127.0.0.1');
    tiempo = modulo.get(TiempoRealService);
    url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });
  afterEach(() => { for (const s of sockets.splice(0)) s.disconnect(); activos.add(bruno); });
  afterAll(async () => app.close());
  it.each([undefined, 'invalido', 'vencido'])('rechaza handshake sin credenciales válidas: %s', async token => {
    const socket = conectar(token);
    await expect(conectado(socket)).rejects.toMatchObject({ data: { codigo: 'NO_AUTORIZADO' } });
  });
  it('rechaza salas ajenas y acepta la participación activa', async () => {
    const a = conectar(ana), c = conectar(ajeno);
    await Promise.all([conectado(a), conectado(c)]);
    expect((await pedido(c, 'desafio.suscribir', { desafioId })).ok).toBe(false);
    expect((await pedido(a, 'desafio.suscribir', { desafioId })).ok).toBe(true);
    expect((await pedido(a, 'desafio.suscribir', { desafioId: 'mal' })).ok).toBe(false);
  });
  it('entrega eventos de cambio y permite resuscribirse después de reconectar', async () => {
    const a = conectar(ana);
    await conectado(a);
    await pedido(a, 'desafio.suscribir', { desafioId });
    const cambio = recibir(a, 'checkin.registrado');
    const ranking = recibir(a, 'ranking.actualizado');
    tiempo.emitir('checkin.registrado', desafioId, { id: bruno, nombre: 'Bruno' });
    await expect(cambio).resolves.toMatchObject({ desafioId, actor: { id: bruno, nombre: 'Bruno' } });
    await expect(ranking).resolves.toMatchObject({ desafioId });
    a.disconnect();
    const reconexion = conectado(a);
    a.connect();
    await reconexion;
    expect((await pedido(a, 'desafio.suscribir', { desafioId })).ok).toBe(true);
    expect((await pedido(a, 'desafio.desuscribir', { desafioId })).ok).toBe(true);
    expect((await pedido(a, 'aliento.enviar', { desafioId, destinatarioId: bruno, emoji: '👏' })).ok).toBe(false);
  });
  it('valida destinatario/emoji y aplica el límite a todas las conexiones de una persona', async () => {
    const a = conectar(ana), a2 = conectar(ana), b = conectar(bruno);
    await Promise.all([conectado(a), conectado(a2), conectado(b)]);
    for (const s of [a, a2, b]) await pedido(s, 'desafio.suscribir', { desafioId });
    for (const [destinatarioId, emoji] of [[ana, '👏'], [ajeno, '👏'], [bruno, 'x']])
      expect((await pedido(a, 'aliento.enviar', { desafioId, destinatarioId, emoji })).ok).toBe(false);
    const recibido = recibir(b, 'aliento.recibido');
    expect((await pedido(a, 'aliento.enviar', { desafioId, destinatarioId: bruno, emoji: '👏' })).ok).toBe(true);
    await expect(recibido).resolves.toMatchObject({ desafioId, destinatarioId: bruno, emoji: '👏', actor: { id: ana } });
    expect(await pedido(a2, 'aliento.enviar', { desafioId, destinatarioId: bruno, emoji: '💪' })).toMatchObject({ ok: false, error: { codigo: 'LIMITE_ALIENTO' } });
    activos.delete(bruno);
    expect((await pedido(b, 'aliento.enviar', { desafioId, destinatarioId: ana, emoji: '👏' })).ok).toBe(false);
  });
  it('permite el transporte polling del navegador con CORS y token', async () => {
    const origen = process.env.WEB_ORIGIN?.trim() || 'http://localhost:8081';
    const respuesta = await fetch(`${url}/socket.io/?EIO=4&transport=polling`, {
      method: 'OPTIONS', headers: { Origin: origen, 'Access-Control-Request-Method': 'POST' },
    });
    expect(respuesta.headers.get('access-control-allow-origin')).toBe(origen);
    const abrir = await fetch(`${url}/socket.io/?EIO=4&transport=polling`);
    const sid = JSON.parse((await abrir.text()).slice(1)).sid as string;
    const canal = `${url}/socket.io/?EIO=4&transport=polling&sid=${encodeURIComponent(sid)}`;
    const enviar = (body: string) => fetch(canal, { method: 'POST', body,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8', Origin: origen } });
    try {
      await enviar(`40${JSON.stringify({ token: ana })}`);
      const conectadoPolling = await fetch(canal);
      expect(await conectadoPolling.text()).toMatch(/^40\{"sid":/);
    } finally { await enviar('1'); }
  });
});
