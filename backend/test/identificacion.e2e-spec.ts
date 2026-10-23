import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import request from 'supertest';
import { UsuarioGuard } from '../src/comun/usuario.guard';
import { PersonasController } from '../src/personas/personas.controller';
import { PersonasService } from '../src/personas/personas.service';
import { Persona } from '../src/personas/entities/persona.entity';
import { DesafiosController } from '../src/desafios/desafios.controller';
import { DesafiosService } from '../src/desafios/desafios.service';
import { Desafio } from '../src/desafios/entities/desafio.entity';
import { ParticipacionesController } from '../src/participaciones/participaciones.controller';
import { ParticipacionesService } from '../src/participaciones/participaciones.service';
import { Participacion } from '../src/participaciones/entities/participacion.entity';
import { CheckinController } from '../src/checkin/checkin.controller';
import { CheckinService } from '../src/checkin/checkin.service';
import { Checkin } from '../src/checkin/entities/checkin.entity';

describe('Identificación provisoria y permisos HTTP con services reales', () => {
  let app: INestApplication;
  const usuario = new Types.ObjectId().toHexString();
  const otraPersona = new Types.ObjectId().toHexString();
  const desafio = new Types.ObjectId().toHexString();
  const consulta = (valor: unknown) => ({
    exec: async () => valor,
    lean: () => ({ exec: async () => valor }),
  });
  const crear = jest.fn();
  const guardar = jest.fn();
  const personas = {
    findById: jest.fn((id: string) =>
      consulta(
        [usuario, otraPersona].includes(id)
          ? { _id: id, nombre: 'Persona' }
          : null,
      ),
    ),
    find: () => consulta([]),
    create: crear,
    findByIdAndUpdate: guardar,
    findByIdAndDelete: guardar,
  };
  const desafios = {
    findById: () => consulta({ _id: desafio, creador: otraPersona }),
    create: crear,
    find: () => consulta([]),
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [
        PersonasController,
        DesafiosController,
        ParticipacionesController,
        CheckinController,
      ],
      providers: [
        PersonasService,
        DesafiosService,
        ParticipacionesService,
        CheckinService,
        { provide: getModelToken(Persona.name), useValue: personas },
        { provide: getModelToken(Desafio.name), useValue: desafios },
        {
          provide: getModelToken(Participacion.name),
          useValue: { create: crear },
        },
        { provide: getModelToken(Checkin.name), useValue: { create: crear } },
        { provide: getConnectionToken(), useValue: {} },
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalGuards(new UsuarioGuard(modulo.get(PersonasService)));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it('exige un header válido, también en lecturas y creación de personas', async () => {
    await request(app.getHttpServer()).get('/desafios').expect(400);
    await request(app.getHttpServer())
      .get('/personas')
      .set('x-usuario-id', 'mal')
      .expect(400);
    await request(app.getHttpServer()).post('/personas').send({}).expect(400);
    await request(app.getHttpServer())
      .get('/personas')
      .set('x-usuario-id', new Types.ObjectId().toHexString())
      .expect(404);
    await request(app.getHttpServer())
      .get('/personas')
      .set('x-usuario-id', usuario)
      .expect(200, []);
  });

  it.each([
    [
      'post',
      '/desafios',
      {
        nombre: 'Caminar',
        categoria: 'SALUD',
        fechaInicio: '2026-12-01',
        fechaFin: '2026-12-08',
        creador: otraPersona,
      },
    ],
    [
      'post',
      '/participaciones',
      { persona: otraPersona, codigoInvitacion: 'DEMOA1' },
    ],
    ['post', '/checkin', { persona: otraPersona, desafio }],
    ['delete', '/checkin/ultimo', { persona: otraPersona, desafio }],
    ['post', `/desafios/${desafio}/cancelar`, { creador: otraPersona }],
    [
      'post',
      `/desafios/${desafio}/participaciones/${otraPersona}/abandonar`,
      {},
    ],
    ['patch', `/personas/${otraPersona}`, { nombre: 'Otro' }],
    ['delete', `/personas/${otraPersona}`, {}],
    ['patch', `/desafios/${desafio}`, { nombre: 'Otro desafío' }],
  ] as const)(
    'rechaza suplantación o edición ajena: %s %s',
    async (metodo, ruta, cuerpo) => {
      await request(app.getHttpServer())
        [metodo](ruta)
        .set('x-usuario-id', usuario)
        .send(cuerpo)
        .expect(403);
      expect(crear).not.toHaveBeenCalled();
      expect(guardar).not.toHaveBeenCalled();
    },
  );
});
