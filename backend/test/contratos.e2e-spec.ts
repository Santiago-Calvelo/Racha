import { Reflector } from '@nestjs/core';
import { TokenService } from '../src/auth/token.service';
import { PersonaAuthService } from '../src/auth/persona-auth.service';
import { AuthController } from '../src/auth/auth.controller';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import supertest from 'supertest';
import { PersonasController } from '../src/personas/personas.controller';
import { PersonasService } from '../src/personas/personas.service';
import { DesafiosController } from '../src/desafios/desafios.controller';
import { DesafiosService } from '../src/desafios/desafios.service';
import { ParticipacionesController } from '../src/participaciones/participaciones.controller';
import { ParticipacionesService } from '../src/participaciones/participaciones.service';
import { CheckinController } from '../src/checkin/checkin.controller';
import { CheckinService } from '../src/checkin/checkin.service';
import { RespuestaInterceptor } from '../src/comun/respuesta.interceptor';
import { UsuarioGuard } from '../src/comun/usuario.guard';

describe('Contratos HTTP', () => {
  let app: INestApplication;
  const persona = new Types.ObjectId();
  const request = (servidor: Parameters<typeof supertest>[0]) =>
    supertest.agent(servidor).set('Authorization', 'Bearer token-prueba');
  const desafio = new Types.ObjectId();
  const personas = { create: jest.fn(), update: jest.fn(), findOne: jest.fn().mockResolvedValue({ _id: persona }) };
  const desafios = {
    listar: jest.fn(),
    listarPorPersona: jest.fn(),
    cancelar: jest.fn(),
  };
  const participaciones = { unirse: jest.fn(), listarActivas: jest.fn() };
  const checkin = { registrar: jest.fn(), listarPorDesafio: jest.fn() };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [
        PersonasController, AuthController,
        DesafiosController,
        ParticipacionesController,
        CheckinController,
      ],
      providers: [
        { provide: PersonasService, useValue: personas },
        { provide: PersonaAuthService, useValue: {} },
        { provide: DesafiosService, useValue: desafios },
        { provide: ParticipacionesService, useValue: participaciones },
        { provide: CheckinService, useValue: checkin },
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new RespuestaInterceptor());
    app.useGlobalGuards(new UsuarioGuard({ verificar: async () => ({}) } as unknown as TokenService, { resolver: async () => ({ _id: persona, alias: 'ana' }) } as unknown as PersonaAuthService, new Reflector()));
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => {
    await app.close();
  });

  it('permite GET /desafios sin body y con filtros opcionales', async () => {
    const pagina = { items: [], pagina: 1, limite: 20, total: 0 };
    desafios.listar.mockResolvedValue(pagina);
    await request(app.getHttpServer()).get('/desafios').expect(200, pagina);
    expect(desafios.listar).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1, limite: 20 }), persona.toHexString());
    await request(app.getHttpServer())
      .get('/desafios')
      .query({ estado: 'ACTIVO', categoria: 'SALUD' })
      .expect(200);
    expect(desafios.listar).toHaveBeenLastCalledWith({
      estado: 'ACTIVO',
      categoria: 'SALUD',
      pagina: 1, limite: 20,
    }, persona.toHexString());
    await request(app.getHttpServer())
      .get('/desafios')
      .query({ categoria: 'INVALIDA' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/desafios')
      .query({ pagina: 0 })
      .expect(400);
    expect(desafios.listar).toHaveBeenCalledTimes(2);
  });

  it('valida el formato antes de consultar los servicios', async () => {
    await request(app.getHttpServer())
      .get('/desafios/persona/invalido')
      .expect(400);
    expect(desafios.listarPorPersona).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post('/participaciones')
      .send({ persona: persona.toHexString(), codigoInvitacion: 'x' })
      .expect(400);
    expect(participaciones.unirse).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post('/checkin')
      .send({ persona: 'mal', desafio: 'mal', nota: 2 })
      .expect(400);
    expect(checkin.registrar).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post(`/desafios/${desafio}/cancelar`)
      .send({ creador: 'mal' })
      .expect(400);
    expect(desafios.cancelar).not.toHaveBeenCalled();
  });

  it('rechaza propiedades adicionales y permite editar solo nombre y zona horaria', async () => {
    for (const campo of ['alias', 'email']) {
      await request(app.getHttpServer())
        .patch('/me')
        .send({ [campo]: 'nuevo' })
        .expect(400);
    }
    expect(personas.update).not.toHaveBeenCalled();
    personas.update.mockResolvedValue({ _id: persona, nombre: 'Ana', __v: 0 });
    await request(app.getHttpServer())
      .patch('/me')
      .send({ nombre: 'Ana', zonaHoraria: 'America/Argentina/Buenos_Aires' })
      .expect(200, { id: persona.toHexString(), nombre: 'Ana' });
    await request(app.getHttpServer())
      .patch('/me')
      .send({ zonaHoraria: '+05:30' })
      .expect(400);
  });

  it('se une por código y devuelve id sin campos internos', async () => {
    participaciones.unirse.mockResolvedValue({
      _id: new Types.ObjectId(),
      persona,
      desafio,
      __v: 0,
    });
    const dto = { codigoInvitacion: 'DEMOA1' };
    const respuesta = await request(app.getHttpServer())
      .post('/participaciones')
      .send(dto)
      .expect(201);
    expect(participaciones.unirse).toHaveBeenCalledWith({ ...dto, persona: persona.toHexString() }, persona.toHexString());
    expect(respuesta.body).toMatchObject({
      persona: persona.toHexString(),
      desafio: desafio.toHexString(),
    });
    expect(respuesta.body.id).toEqual(expect.any(String));
    expect(respuesta.body).not.toHaveProperty('_id');
    expect(respuesta.body).not.toHaveProperty('__v');
  });

  it('oculta campos internos también en participantes poblados y conserva fechas', async () => {
    participaciones.listarActivas.mockResolvedValue([
      {
        _id: new Types.ObjectId(),
        __v: 1,
        persona: { _id: persona, nombre: 'Ana', __v: 2 },
        fechaIngreso: new Date('2026-10-16T12:00:00Z'),
      },
    ]);
    const respuesta = await request(app.getHttpServer())
      .get(`/desafios/${desafio}/participaciones`)
      .expect(200);
    expect(respuesta.body[0].persona).toEqual({
      id: persona.toHexString(),
      nombre: 'Ana',
    });
    expect(respuesta.body[0].fechaIngreso).toBe('2026-10-16T12:00:00.000Z');
    expect(JSON.stringify(respuesta.body)).not.toMatch(/"(_id|__v)"/);
  });

  it('consulta los desafíos y check-ins de una persona', async () => {
    desafios.listarPorPersona.mockResolvedValue([]);
    checkin.listarPorDesafio.mockResolvedValue({ items: [], pagina: 1, limite: 20, total: 0 });
    await request(app.getHttpServer())
      .get(`/desafios/persona/${persona}`)
      .expect(200, []);
    expect(desafios.listarPorPersona).toHaveBeenCalledWith(
      persona.toHexString(),
    );
    await request(app.getHttpServer())
      .get(`/checkin/desafio/${desafio}/persona/${persona}`)
      .expect(200, { items: [], pagina: 1, limite: 20, total: 0 });
    expect(checkin.listarPorDesafio).toHaveBeenCalledWith(
      desafio.toHexString(),
      persona.toHexString(),
      { pagina: 1, limite: 20 },
    );
  });
});
