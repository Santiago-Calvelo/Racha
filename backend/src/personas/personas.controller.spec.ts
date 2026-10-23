import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PersonasController } from './personas.controller';
import { PersonasService } from './personas.service';
import { CreatePersonaDto } from './dto/create-persona.dto';

describe('PersonasController', () => {
  let controller: PersonasController;
  let servicio: jest.Mocked<PersonasService>;

  const dtoValido: CreatePersonaDto = {
    nombre: 'Ana Pérez',
    alias: 'ana_perez',
    email: 'ana@example.com',
  };

  beforeEach(async () => {
    const servicioMock = {
      create: jest.fn((dto: CreatePersonaDto) =>
        Promise.resolve({
          _id: new Types.ObjectId(),
          zonaHoraria: 'America/Argentina/Buenos_Aires',
          ...dto,
        }),
      ),
      findAll: jest.fn(() => Promise.resolve([])),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonasController],
      providers: [{ provide: PersonasService, useValue: servicioMock }],
    }).compile();

    controller = module.get<PersonasController>(PersonasController);
    servicio = module.get(PersonasService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delega la creación en el servicio', async () => {
    const persona = await controller.create(dtoValido);

    expect(persona).toMatchObject({
      nombre: 'Ana Pérez',
      alias: 'ana_perez',
      email: 'ana@example.com',
      zonaHoraria: 'America/Argentina/Buenos_Aires',
    });
    expect(servicio.create).toHaveBeenCalledWith(dtoValido);
  });

  it('propaga el ConflictException de alias duplicado', async () => {
    servicio.create.mockRejectedValueOnce(
      new ConflictException('El alias "ana_perez" ya está en uso'),
    );

    await expect(
      controller.create({ ...dtoValido, email: 'otra@example.com' }),
    ).rejects.toThrow(ConflictException);
  });

  it('busca, actualiza y elimina personas por id', async () => {
    const id = new Types.ObjectId().toHexString();
    const creada = {
      _id: id,
      ...dtoValido,
      zonaHoraria: 'America/Argentina/Buenos_Aires',
    };
    servicio.findOne.mockResolvedValueOnce(creada);
    servicio.update.mockResolvedValueOnce({ ...creada, nombre: 'Ana P.' });
    servicio.remove.mockResolvedValueOnce(creada);

    expect(await controller.findOne(id)).toEqual(creada);
    expect((await controller.update(id, { nombre: 'Ana P.' }, id)).nombre).toBe(
      'Ana P.',
    );
    expect(await controller.remove(id, id)).toEqual(creada);
  });
});
