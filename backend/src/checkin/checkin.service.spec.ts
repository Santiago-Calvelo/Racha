import { Test } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CheckinService } from './checkin.service';
import { Checkin } from './entities/checkin.entity';
import { Desafio } from '../desafios/entities/desafio.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Participacion } from '../participaciones/entities/participacion.entity';

describe('CheckinService', () => {
  const persona = new Types.ObjectId();
  const desafio = new Types.ObjectId();
  const consulta = (valor: unknown) => ({
    session: () => consulta(valor),
    skip: () => consulta(valor),
    limit: () => consulta(valor),
    lean: () => ({ exec: async () => valor }),
  });
  const personas = { findById: jest.fn(), updateOne: jest.fn() };
  const desafios = { findById: jest.fn(), updateOne: jest.fn() };
  const participaciones = { findOne: jest.fn() };
  const checkins = { find: jest.fn(), create: jest.fn(), countDocuments: jest.fn().mockResolvedValue(0) };
  let servicio: CheckinService;

  beforeEach(async () => {
    jest.clearAllMocks();
    personas.findById.mockReturnValue({
      exec: async () => ({ _id: persona, zonaHoraria: 'UTC' }),
    });
    desafios.findById.mockReturnValue(
      consulta({ _id: desafio, fechaCancelacion: new Date() }),
    );
    const modulo = await Test.createTestingModule({
      providers: [
        CheckinService,
        { provide: getConnectionToken(), useValue: { startSession: async () => ({ withTransaction: async (f: () => Promise<unknown>) => f(), endSession: async () => undefined }) } },
        { provide: getModelToken(Checkin.name), useValue: checkins },
        { provide: getModelToken(Persona.name), useValue: personas },
        { provide: getModelToken(Desafio.name), useValue: desafios },
        {
          provide: getModelToken(Participacion.name),
          useValue: participaciones,
        },
      ],
    }).compile();
    servicio = modulo.get(CheckinService);
  });

  it('prioriza existencia y permiso antes del conflicto por cancelación', async () => {
    const dto = { persona: String(persona), desafio: String(desafio) };
    personas.findById.mockReturnValueOnce({ exec: async () => null });
    await expect(servicio.registrar(dto, dto.persona)).rejects.toThrow(NotFoundException);
    participaciones.findOne.mockReturnValue(consulta(null));
    await expect(servicio.registrar(dto, dto.persona)).rejects.toThrow(ForbiddenException);
    participaciones.findOne.mockReturnValue(consulta({ persona, desafio }));
    await expect(servicio.registrar(dto, dto.persona)).rejects.toThrow(ConflictException);
    expect(checkins.create).not.toHaveBeenCalled();
  });

  it('filtra por persona y desafío incluso cuando el desafío está cancelado', async () => {
    const sort = jest.fn(() => consulta([]));
    checkins.find.mockReturnValue({ sort });
    expect(
      await servicio.listarPorDesafio(String(desafio), String(persona)),
    ).toEqual({ items: [], total: 0, pagina: 1, limite: 20 });
    expect(checkins.find).toHaveBeenLastCalledWith({
      desafio,
      persona: String(persona),
    });
    expect(sort).toHaveBeenCalledWith({ dia: -1, _id: -1 });
    await servicio.listarPorDesafio(String(desafio));
    expect(checkins.find).toHaveBeenLastCalledWith({ desafio });
  });
});
