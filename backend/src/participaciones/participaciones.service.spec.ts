import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ParticipacionesService } from './participaciones.service';
import { Participacion } from './entities/participacion.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Desafio } from '../desafios/entities/desafio.entity';
import { hoyReferencia } from '../comun/fechas';

describe('Unión por código de invitación', () => {
  const persona = new Types.ObjectId();
  const desafio = new Types.ObjectId();
  const dto = { persona: String(persona), codigoInvitacion: 'DEMOA1' };
  const consulta = (valor: unknown) => ({
    session: () => consulta(valor),
    select: () => consulta(valor),
    exec: async () => valor,
    lean: () => ({ exec: async () => valor }),
  });
  const personas = { findById: jest.fn(), updateOne: jest.fn() };
  const desafios = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
  };
  const participaciones = {
    create: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
  };
  const sesion = {
    withTransaction: jest.fn(async (operacion: () => Promise<unknown>) =>
      operacion(),
    ),
    endSession: jest.fn(),
  };
  let servicio: ParticipacionesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    personas.findById.mockReturnValue(consulta({ _id: persona }));
    personas.updateOne.mockResolvedValue({ matchedCount: 1 });
    desafios.countDocuments.mockReturnValue(consulta(0));
    participaciones.find.mockReturnValue(consulta([]));
    desafios.findOneAndUpdate.mockReturnValue(
      consulta({
        _id: desafio,
        fechaInicio: hoyReferencia(),
        fechaFin: hoyReferencia(),
        fechaCancelacion: null,
        maximoParticipantes: 10,
      }),
    );
    desafios.findOne.mockReturnValue(
      consulta({
        _id: desafio,
        fechaInicio: hoyReferencia(),
        fechaFin: hoyReferencia(),
        fechaCancelacion: null,
        maximoParticipantes: 10,
      }),
    );
    participaciones.countDocuments.mockResolvedValue(0);
    const modulo = await Test.createTestingModule({
      providers: [
        ParticipacionesService,
        { provide: getModelToken(Persona.name), useValue: personas },
        { provide: getModelToken(Desafio.name), useValue: desafios },
        {
          provide: getModelToken(Participacion.name),
          useValue: participaciones,
        },
        {
          provide: getConnectionToken(),
          useValue: { startSession: async () => sesion },
        },
      ],
    }).compile();
    servicio = modulo.get(ParticipacionesService);
  });

  it('busca el código y registra la participación en una transacción', async () => {
    participaciones.create.mockResolvedValue([
      { toObject: () => ({ persona, desafio }) },
    ]);
    expect(await servicio.unirse(dto)).toEqual({ persona, desafio });
    expect(desafios.findOne).toHaveBeenCalledWith({
      codigoInvitacion: 'DEMOA1',
    });
    expect(participaciones.create).toHaveBeenCalledWith(
      [expect.objectContaining({ persona, desafio, estado: 'ACTIVA' })],
      { session: sesion },
    );
    expect(sesion.endSession).toHaveBeenCalled();
    expect(personas.updateOne).toHaveBeenCalledWith(
      { _id: persona },
      { $inc: { __v: 1 } },
      { session: sesion },
    );
    expect(desafios.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: desafio },
      { $inc: { __v: 1 } },
      { new: true, session: sesion },
    );
  });

  it('rechaza una sexta participación vigente sin insertar y cierra la sesión', async () => {
    desafios.countDocuments.mockReturnValueOnce(consulta(5));
    await expect(servicio.unirse(dto)).rejects.toThrow(ConflictException);
    expect(participaciones.create).not.toHaveBeenCalled();
    expect(sesion.endSession).toHaveBeenCalled();
  });

  it('revalida el estado y el cupo dentro de la transacción', async () => {
    desafios.findOneAndUpdate.mockReturnValueOnce(
      consulta({ fechaCancelacion: new Date() }),
    );
    await expect(servicio.unirse(dto)).rejects.toThrow(ConflictException);
    expect(participaciones.create).not.toHaveBeenCalled();
    desafios.findOneAndUpdate.mockReturnValueOnce(
      consulta({
        _id: desafio,
        fechaInicio: hoyReferencia(),
        fechaFin: hoyReferencia(),
        fechaCancelacion: null,
        maximoParticipantes: 2,
      }),
    );
    participaciones.countDocuments.mockResolvedValueOnce(2);
    await expect(servicio.unirse(dto)).rejects.toThrow(ConflictException);
    expect(participaciones.create).not.toHaveBeenCalled();
  });

  it('devuelve 404 ante código inexistente y 409 ante cancelación, cupo o duplicidad', async () => {
    desafios.findOne.mockReturnValueOnce(consulta(null));
    await expect(servicio.unirse(dto)).rejects.toThrow(NotFoundException);
    desafios.findOne.mockReturnValueOnce(
      consulta({ fechaCancelacion: new Date() }),
    );
    await expect(servicio.unirse(dto)).rejects.toThrow(ConflictException);
    participaciones.countDocuments.mockResolvedValueOnce(10);
    await expect(servicio.unirse(dto)).rejects.toThrow(ConflictException);
    participaciones.create.mockRejectedValueOnce(
      Object.assign(new Error('Duplicado'), { code: 11000 }),
    );
    await expect(servicio.unirse(dto)).rejects.toThrow(ConflictException);
  });
});
