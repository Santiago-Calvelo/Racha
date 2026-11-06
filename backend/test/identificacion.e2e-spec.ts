import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import request from 'supertest';
import { UsuarioGuard } from '../src/comun/usuario.guard';
import { TokenService } from '../src/auth/token.service';
import { PersonaAuthService } from '../src/auth/persona-auth.service';
import { AuthController } from '../src/auth/auth.controller';
import { PersonasService } from '../src/personas/personas.service';
import { DesafiosController } from '../src/desafios/desafios.controller';
import { DesafiosService } from '../src/desafios/desafios.service';
import { ParticipacionesController } from '../src/participaciones/participaciones.controller';
import { ParticipacionesService } from '../src/participaciones/participaciones.service';
import { CheckinController } from '../src/checkin/checkin.controller';
import { CheckinService } from '../src/checkin/checkin.service';

describe('Identidad autenticada HTTP', () => {
  let app: INestApplication;
  const id = new Types.ObjectId().toHexString();
  const desafio = new Types.ObjectId().toHexString();
  const persona = { _id: id, nombre: 'Ana', alias: 'ana' as string | undefined };
  const crear = jest.fn().mockResolvedValue({});
  const unir = jest.fn().mockResolvedValue({});
  const abandonar = jest.fn().mockResolvedValue({});
  const registrar = jest.fn().mockResolvedValue({});
  const tokens = { verificar: async (token: string) => {
    if (token !== 'valido') throw new UnauthorizedException('La sesión no es válida');
    return { emisor: 'https://test.auth0.com/', sujeto: 'google-oauth2|123', expira: 9999999999 };
  } };
  const personas = { resolver: async () => persona, alias: jest.fn() };
  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [AuthController, DesafiosController, ParticipacionesController, CheckinController],
      providers: [
        { provide: PersonasService, useValue: {} }, { provide: PersonaAuthService, useValue: personas },
        { provide: DesafiosService, useValue: { crear, listar: async () => [] } },
        { provide: ParticipacionesService, useValue: { unirse: unir, abandonar } },
        { provide: CheckinService, useValue: { registrar } },
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalGuards(new UsuarioGuard(tokens as TokenService, personas as unknown as PersonaAuthService, new Reflector()));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  beforeEach(() => { jest.clearAllMocks(); persona.alias = 'ana'; });
  afterAll(async () => app.close());
  it('devuelve 401 para ausencia/token inválido y ya no acepta el header provisional', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
    await request(app.getHttpServer()).get('/me').set('Authorization', 'Bearer vencido').expect(401);
    await request(app.getHttpServer()).get('/me').set('x-usuario-id', id).expect(401);
    await request(app.getHttpServer()).get('/me').set('Authorization', 'Bearer valido').expect(200);
  });
  it('bloquea operaciones hasta elegir alias, permitiendo /me y /me/alias', async () => {
    persona.alias = undefined;
    await request(app.getHttpServer()).get('/me').set('Authorization', 'Bearer valido').expect(200);
    await request(app.getHttpServer()).get('/desafios').set('Authorization', 'Bearer valido').expect(403);
    personas.alias.mockResolvedValue({ ...persona, alias: 'nuevo' });
    await request(app.getHttpServer()).patch('/me/alias').set('Authorization', 'Bearer valido').send({ alias: 'nuevo' }).expect(200);
  });
  it('rechaza actores enviados por body y deriva el actor del token', async () => {
    for (const [ruta, datos] of [
      ['/participaciones', { codigoInvitacion: 'DEMOA1', persona: id }],
      ['/checkin', { desafio, persona: id }],
    ] as const)
      await request(app.getHttpServer()).post(ruta).set('Authorization', 'Bearer valido').send(datos).expect(400);
    expect(unir).not.toHaveBeenCalled();
    expect(registrar).not.toHaveBeenCalled();
    await request(app.getHttpServer()).post('/participaciones').set('Authorization', 'Bearer valido').send({ codigoInvitacion: 'DEMOA1' }).expect(201);
    expect(unir).toHaveBeenCalledWith({ persona: id, codigoInvitacion: 'DEMOA1' }, id);
    await request(app.getHttpServer()).post('/checkin').set('Authorization', 'Bearer valido').send({ desafio }).expect(201);
    expect(registrar).toHaveBeenCalledWith({ persona: id, desafio }, id);
    await request(app.getHttpServer()).post(`/desafios/${desafio}/abandonar`).set('Authorization', 'Bearer valido').expect(201);
    expect(abandonar).toHaveBeenCalledWith(desafio, id, id);
  });
});
