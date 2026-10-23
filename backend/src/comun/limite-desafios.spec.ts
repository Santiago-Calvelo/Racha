import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { DesafiosService } from '../desafios/desafios.service';
import { CategoriaDesafio, Desafio } from '../desafios/entities/desafio.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Participacion } from '../participaciones/entities/participacion.entity';
import { hoyReferencia } from './fechas';

describe('Límite de desafíos al crear', () => {
  const persona = new Types.ObjectId();
  const desafioAnterior = new Types.ObjectId();
  interface Consulta {
    session: () => Consulta;
    select: () => Consulta;
    lean: () => Consulta;
    exec: () => Promise<unknown>;
  }
  const consulta = (valor: unknown): Consulta => ({
    session: jest.fn(() => consulta(valor)),
    select: jest.fn(() => consulta(valor)),
    lean: jest.fn(() => consulta(valor)),
    exec: async () => valor,
  });
  const personas = { findById: jest.fn(), updateOne: jest.fn() };
  const desafios = { countDocuments: jest.fn(), create: jest.fn() };
  const participaciones = { find: jest.fn(), create: jest.fn() };
  const sesion = {
    withTransaction: async (accion: () => Promise<unknown>) => accion(),
    endSession: jest.fn(),
  };
  let servicio: DesafiosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    personas.findById.mockReturnValue(consulta({ _id: persona }));
    personas.updateOne.mockResolvedValue({ matchedCount: 1 });
    participaciones.find.mockReturnValue(
      consulta([{ desafio: desafioAnterior }]),
    );
    desafios.countDocuments.mockReturnValue(consulta(4));
    desafios.create.mockResolvedValue([
      {
        _id: new Types.ObjectId(),
        toObject: () => ({ nombre: 'Nuevo desafío' }),
      },
    ]);
    participaciones.create.mockResolvedValue([]);
    const modulo = await Test.createTestingModule({
      providers: [
        DesafiosService,
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
    servicio = modulo.get(DesafiosService);
  });

  const dto = () => {
    const inicio = hoyReferencia();
    const fin = new Date(`${inicio}T12:00:00Z`);
    fin.setUTCDate(fin.getUTCDate() + 3);
    return {
      nombre: 'Nuevo desafío',
      categoria: CategoriaDesafio.SALUD,
      creador: String(persona),
      fechaInicio: inicio,
      fechaFin: fin.toISOString().slice(0, 10),
    };
  };

  it('cuenta por participaciones activas, sin limitarse al creador del desafío', async () => {
    await servicio.crear(dto(), String(persona));
    expect(personas.updateOne).toHaveBeenCalledWith(
      { _id: persona },
      { $inc: { __v: 1 } },
      { session: sesion },
    );
    expect(participaciones.find).toHaveBeenCalledWith({
      persona,
      estado: 'ACTIVA',
    });
    expect(desafios.countDocuments).toHaveBeenCalledWith({
      _id: { $in: [desafioAnterior] },
      fechaCancelacion: null,
      fechaFin: { $gte: hoyReferencia() },
    });
    expect(desafios.create).toHaveBeenCalledTimes(1);
    expect(participaciones.create).toHaveBeenCalledTimes(1);
  });

  it('rechaza crear el sexto y libera la sesión sin insertar', async () => {
    desafios.countDocuments.mockReturnValueOnce(consulta(5));
    await expect(servicio.crear(dto(), String(persona))).rejects.toThrow(ConflictException);
    expect(desafios.create).not.toHaveBeenCalled();
    expect(participaciones.create).not.toHaveBeenCalled();
    expect(sesion.endSession).toHaveBeenCalled();
  });
});
