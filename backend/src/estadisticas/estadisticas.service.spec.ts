import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { EstadisticasService } from './estadisticas.service';
import { Persona } from '../personas/entities/persona.entity';
import { Desafio } from '../desafios/entities/desafio.entity';
import { Checkin } from '../checkin/entities/checkin.entity';
import { Participacion } from '../participaciones/entities/participacion.entity';

describe('Ranking y ganador', () => {
  it('ordena por puntos, racha y alias, omite abandonados y usa la fecha final', async () => {
    const ids = Array.from({ length: 4 }, () => new Types.ObjectId());
    const personas = ['bruno', 'ana', 'carla', 'dora'].map((alias, i) => ({
      _id: ids[i],
      nombre: alias,
      alias,
      zonaHoraria: 'UTC',
    }));
    const consulta = (valor: unknown) => ({
      lean: () => ({ exec: async () => valor }),
    });
    const modulo = await Test.createTestingModule({
      providers: [
        EstadisticasService,
        {
          provide: getModelToken(Desafio.name),
          useValue: {
            findById: () =>
              consulta({
                fechaInicio: '2020-01-01',
                fechaFin: '2020-01-03',
                fechaCancelacion: null,
              }),
          },
        },
        {
          provide: getModelToken(Participacion.name),
          useValue: {
            find: jest.fn(() => consulta(ids.map((persona) => ({ persona })))),
          },
        },
        {
          provide: getModelToken(Persona.name),
          useValue: { find: () => consulta(personas) },
        },
        {
          provide: getModelToken(Checkin.name),
          useValue: {
            find: () =>
              consulta([
                { persona: ids[0], dia: '2020-01-03', puntos: 10 },
                { persona: ids[1], dia: '2020-01-03', puntos: 10 },
                { persona: ids[2], dia: '2020-01-01', puntos: 10 },
              ]),
          },
        },
      ],
    }).compile();
    const servicio = modulo.get(EstadisticasService);
    const resultado = await servicio.ranking(String(new Types.ObjectId()));
    expect(resultado.participantes.map((p) => p.persona.alias)).toEqual([
      'ana',
      'bruno',
      'carla',
      'dora',
    ]);
    expect(resultado.participantes.map((p) => p.rachaActual)).toEqual([
      1, 1, 0, 0,
    ]);
    expect(resultado.ganador?.persona.alias).toBe('ana');
    expect(
      modulo.get(getModelToken(Participacion.name)).find,
    ).toHaveBeenCalledWith(expect.objectContaining({ estado: 'ACTIVA' }));
    await modulo.close();
  });
});
