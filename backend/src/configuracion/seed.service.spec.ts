import { Test } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { model } from 'mongoose';
import { SeedService } from './seed.service';
import { Persona, PersonaEsquema } from '../personas/entities/persona.entity';
import { Desafio, DesafioEsquema } from '../desafios/entities/desafio.entity';
import {
  Participacion,
  ParticipacionEsquema,
} from '../participaciones/entities/participacion.entity';

describe('Seed idempotente', () => {
  const personas = new Map();
  const desafios = new Map();
  const participaciones = new Map();
  const personaModelo = model('PersonaSeedTest', PersonaEsquema);
  const desafioModelo = model('DesafioSeedTest', DesafioEsquema);
  const participacionModelo = model(
    'ParticipacionSeedTest',
    ParticipacionEsquema,
  );

  it('valida los documentos y conserva datos al ejecutarse dos veces', async () => {
    let finalizarIndices!: () => void;
    const indicesPendientes = new Promise<void>((resolve) => {
      finalizarIndices = resolve;
    });
    const personaMock = {
      init: jest.fn().mockResolvedValue(undefined),
      findOneAndUpdate: jest.fn((filtro, actualizacion) => ({
        exec: async () => {
          if (!personas.has(filtro.alias)) {
            const documento = new personaModelo(actualizacion.$setOnInsert);
            await documento.validate();
            personas.set(filtro.alias, documento);
          }
          return personas.get(filtro.alias);
        },
      })),
    };
    Object.assign(desafioModelo, {
      init: jest.fn().mockResolvedValue(undefined),
      findOneAndUpdate: jest.fn((filtro, actualizacion) => ({
        exec: async () => {
          if (!desafios.has(filtro.codigoInvitacion)) {
            const documento = new desafioModelo(actualizacion.$setOnInsert);
            await documento.validate();
            desafios.set(filtro.codigoInvitacion, documento);
          }
          return desafios.get(filtro.codigoInvitacion);
        },
      })),
    });
    const participacionMock = {
      init: jest.fn().mockResolvedValue(undefined),
      updateOne: jest.fn((filtro, actualizacion) => ({
        exec: async () => {
          const clave = `${filtro.persona}:${filtro.desafio}`;
          if (!participaciones.has(clave)) {
            const documento = new participacionModelo({
              ...filtro,
              ...actualizacion.$setOnInsert,
            });
            await documento.validate();
            participaciones.set(clave, documento);
          }
        },
      })),
    };
    const modulo = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: getModelToken(Persona.name), useValue: personaMock },
        { provide: getModelToken(Desafio.name), useValue: desafioModelo },
        {
          provide: getModelToken(Participacion.name),
          useValue: participacionMock,
        },
        {
          provide: getConnectionToken(),
          useValue: {
            models: {
              personas: personaMock,
              desafios: desafioModelo,
              participaciones: participacionMock,
              checkin: { init: () => indicesPendientes },
            },
          },
        },
      ],
    }).compile();
    try {
      const seed = modulo.get(SeedService);
      const primeraCarga = seed.ejecutar();
      expect(personaMock.findOneAndUpdate).not.toHaveBeenCalled();
      finalizarIndices();
      await primeraCarga;
      const ids = [...desafios.values()].map((documento) =>
        String(documento._id),
      );
      personas.get('seed_ana').nombre = 'Nombre editado';
      desafios.get('DEMOA1').nombre = 'Desafío editado';
      const primeraParticipacion = [...participaciones.values()][0];
      primeraParticipacion.estado = 'ABANDONADA';
      await seed.ejecutar();
      expect(personas.size).toBe(3);
      expect(desafios.size).toBe(2);
      expect(participaciones.size).toBe(2);
      expect(personas.get('seed_ana').nombre).toBe('Nombre editado');
      expect(desafios.get('DEMOA1').nombre).toBe('Desafío editado');
      expect(primeraParticipacion.estado).toBe('ABANDONADA');
      expect(
        [...desafios.values()].map((documento) => String(documento._id)),
      ).toEqual(ids);
    } finally {
      await modulo.close();
    }
  });
});
