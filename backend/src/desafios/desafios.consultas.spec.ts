import { Test } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { model, Types } from 'mongoose';
import { DesafiosService } from './desafios.service';
import {
  CategoriaDesafio,
  Desafio,
  DesafioEsquema,
} from './entities/desafio.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Participacion } from '../participaciones/entities/participacion.entity';
import { hoyReferencia } from '../comun/fechas';

describe('Consultas y estados de desafíos', () => {
  const id = new Types.ObjectId();
  const creador = new Types.ObjectId();
  const consulta = (valor: unknown) => ({
    sort: () => consulta(valor), skip: () => consulta(valor), limit: () => consulta(valor),
    lean: () => ({ exec: async () => valor }),
  });
  const activos = {
    _id: id,
    nombre: 'Activo',
    categoria: CategoriaDesafio.SALUD,
    fechaInicio: hoyReferencia(),
    fechaFin: hoyReferencia(),
    fechaCancelacion: null,
  };
  const cancelado = {
    ...activos,
    nombre: 'Cancelado',
    fechaCancelacion: new Date(),
  };
  const documentos = { find: jest.fn(), findById: jest.fn(), countDocuments: jest.fn().mockResolvedValue(2) };
  const personas = { findById: jest.fn() };
  const participaciones = { find: jest.fn() };
  let servicio: DesafiosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    participaciones.find.mockReturnValue(consulta([]));
    const modulo = await Test.createTestingModule({
      providers: [
        DesafiosService,
        { provide: getModelToken(Desafio.name), useValue: documentos },
        { provide: getModelToken(Persona.name), useValue: personas },
        {
          provide: getModelToken(Participacion.name),
          useValue: participaciones,
        },
        { provide: getConnectionToken(), useValue: {} },
      ],
    }).compile();
    servicio = modulo.get(DesafiosService);
  });

  it('lista sin filtros y combina categoría con estado calculado', async () => {
    documentos.find.mockImplementation(() => consulta([activos, cancelado]));
    expect((await servicio.listar()).items).toHaveLength(2);
    expect(documentos.find).toHaveBeenLastCalledWith({});
    documentos.find.mockReturnValueOnce(consulta([activos]));
    const resultado = await servicio.listar({
      estado: 'ACTIVO',
      categoria: CategoriaDesafio.SALUD,
    });
    expect(resultado.items).toEqual([{ ...activos, estado: 'ACTIVO', participantesActivos: 0, miParticipacion: null }]);
    expect(documentos.find).toHaveBeenLastCalledWith({ categoria: 'SALUD', fechaCancelacion: null, fechaInicio: { $lte: hoyReferencia() }, fechaFin: { $gte: hoyReferencia() } });
  });

  it('lista por participaciones de la persona y comprueba su existencia', async () => {
    personas.findById.mockReturnValue({ exec: async () => ({ _id: creador }) });
    participaciones.find.mockReturnValue(consulta([{ desafio: id }]));
    documentos.find.mockReturnValue(consulta([activos]));
    expect(await servicio.listarPorPersona(String(creador))).toHaveLength(1);
    expect(participaciones.find).toHaveBeenCalledWith({
      persona: String(creador),
    });
    expect(documentos.find).toHaveBeenCalledWith({ _id: { $in: [id] } });
    personas.findById.mockReturnValue({ exec: async () => null });
    await expect(servicio.listarPorPersona(String(creador))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('prioriza existencia y permisos antes del conflicto de estado al cancelar', async () => {
    documentos.findById.mockReturnValue({ exec: async () => null });
    await expect(
      servicio.cancelar(String(id), String(creador), String(creador)),
    ).rejects.toThrow(NotFoundException);
    const documento = {
      ...cancelado,
      creador,
      toObject: () => cancelado,
      save: jest.fn(),
    };
    documentos.findById.mockReturnValue({ exec: async () => documento });
    personas.findById.mockReturnValue({ exec: async () => null });
    await expect(
      servicio.cancelar(String(id), String(creador), String(creador)),
    ).rejects.toThrow(NotFoundException);
    personas.findById.mockReturnValue({ exec: async () => ({ _id: creador }) });
    await expect(
      servicio.cancelar(String(id), String(new Types.ObjectId()), String(creador)),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      servicio.cancelar(String(id), String(creador), String(creador)),
    ).rejects.toThrow(ConflictException);
    expect(documento.save).not.toHaveBeenCalled();
  });

  it('devuelve 409 si una unión cambia la versión durante la edición del cupo', async () => {
    const Modelo = model('DesafioEdicionConcurrenteTest', DesafioEsquema);
    const inicio = new Date(`${hoyReferencia()}T12:00:00Z`);
    inicio.setUTCDate(inicio.getUTCDate() + 1);
    const fin = new Date(inicio);
    fin.setUTCDate(fin.getUTCDate() + 3);
    const documento = Modelo.hydrate({
      _id: id,
      __v: 0,
      nombre: 'Desafío pendiente',
      creador,
      categoria: CategoriaDesafio.SALUD,
      codigoInvitacion: 'DEMOA1',
      fechaInicio: inicio.toISOString().slice(0, 10),
      fechaFin: fin.toISOString().slice(0, 10),
      maximoParticipantes: 10,
      fechaCancelacion: null,
    });
    documentos.findById.mockReturnValue({ exec: async () => documento });
    const escritura = jest
      .spyOn(Modelo.collection, 'updateOne')
      .mockResolvedValue({
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 0,
        upsertedId: null,
      });
    // El conteo queda por debajo del nuevo cupo, pero la versión ya cambió.
    Object.assign(participaciones, {
      countDocuments: jest.fn(() => ({ exec: async () => 1 })),
    });
    try {
      await expect(
        servicio.actualizar(String(id), { maximoParticipantes: 2 }, String(creador)),
      ).rejects.toThrow(ConflictException);
      expect(escritura.mock.calls[0][0]).toMatchObject({ _id: id, __v: 0 });
    } finally {
      escritura.mockRestore();
    }
  });
});
