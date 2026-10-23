import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PersonasService } from './personas.service';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { Persona } from './entities/persona.entity';

describe('PersonasService', () => {
  let service: PersonasService;

  const dtoValido: CreatePersonaDto = {
    nombre: 'Ana Pérez',
    alias: 'ana_perez',
    email: 'ana@example.com',
  };

  /** Almacén en memoria que simula la colección `personas`. */
  let almacen: (Persona & { _id: Types.ObjectId })[];
  let modeloMock: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
  };

  const consulta = (valor: unknown) => ({
    lean: () => ({ exec: () => Promise.resolve(valor) }),
  });

  const errorDuplicado = (campo: 'alias' | 'email', valor: string) =>
    Object.assign(new Error('E11000 duplicate key'), {
      code: 11000,
      keyValue: { [campo]: valor },
    });

  const idDe = (persona: Persona): string =>
    String((persona as unknown as { _id: Types.ObjectId })._id);

  beforeEach(async () => {
    almacen = [];

    modeloMock = {
      // `create` aplica la unicidad como lo haría el índice único de Mongo.
      create: jest.fn((datos: Persona) => {
        const alias = datos.alias.toLowerCase();
        const email = datos.email.toLowerCase();
        if (almacen.some((p) => p.alias.toLowerCase() === alias)) {
          throw errorDuplicado('alias', datos.alias);
        }
        if (almacen.some((p) => p.email.toLowerCase() === email)) {
          throw errorDuplicado('email', datos.email);
        }
        const persona = { ...datos, _id: new Types.ObjectId() };
        almacen.push(persona);
        return Promise.resolve(persona);
      }),
      find: jest.fn(() => consulta([...almacen])),
      findById: jest.fn((id: string) =>
        consulta(almacen.find((p) => p._id.toHexString() === id) ?? null),
      ),
      findByIdAndUpdate: jest.fn((id: string, datos: Persona) => {
        const indice = almacen.findIndex((p) => p._id.toHexString() === id);
        if (indice === -1) {
          return consulta(null);
        }
        const resto = almacen.filter((_, i) => i !== indice);
        if (
          resto.some((p) => p.alias.toLowerCase() === datos.alias.toLowerCase())
        ) {
          throw errorDuplicado('alias', datos.alias);
        }
        if (
          resto.some((p) => p.email.toLowerCase() === datos.email.toLowerCase())
        ) {
          throw errorDuplicado('email', datos.email);
        }
        almacen[indice] = { ...almacen[indice], ...datos };
        return consulta({ ...almacen[indice] });
      }),
      findByIdAndDelete: jest.fn((id: string) => {
        almacen = almacen.filter((p) => p._id.toHexString() !== id);
        return { exec: () => Promise.resolve(null) };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonasService,
        { provide: getModelToken(Persona.name), useValue: modeloMock },
      ],
    }).compile();

    service = module.get<PersonasService>(PersonasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('crea una persona con la zona horaria por defecto', async () => {
      const persona = await service.create(dtoValido);

      expect(persona).toMatchObject({
        nombre: 'Ana Pérez',
        alias: 'ana_perez',
        email: 'ana@example.com',
        zonaHoraria: 'America/Argentina/Buenos_Aires',
      });
    });

    it('respeta la zona horaria IANA indicada', async () => {
      const persona = await service.create({
        ...dtoValido,
        zonaHoraria: 'Europe/Madrid',
      });

      expect(persona.zonaHoraria).toBe('Europe/Madrid');
    });

    it('normaliza alias y email a minúsculas', async () => {
      const persona = await service.create({
        ...dtoValido,
        alias: 'Ana_Perez',
        email: 'ANA@example.com',
      });

      expect(persona.alias).toBe('ana_perez');
      expect(persona.email).toBe('ana@example.com');
    });

    it('acepta alias de 3 y de 20 caracteres', async () => {
      expect((await service.create({ ...dtoValido, alias: 'abc' })).alias).toBe(
        'abc',
      );
      expect(
        (
          await service.create({
            ...dtoValido,
            alias: 'a'.repeat(20),
            email: 'b@example.com',
          })
        ).alias,
      ).toBe('a'.repeat(20));
    });

    it('rechaza alias fuera del rango de 3 a 20 caracteres', async () => {
      await expect(
        service.create({ ...dtoValido, alias: 'ab' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ ...dtoValido, alias: 'a'.repeat(21) }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza alias con caracteres distintos de letra ASCII, número y guion bajo', async () => {
      for (const alias of [
        'ana perez',
        'ana-perez',
        'ana.perez',
        'ñandú',
        'ana@red',
      ]) {
        await expect(service.create({ ...dtoValido, alias })).rejects.toThrow(
          BadRequestException,
        );
      }
    });

    it('rechaza email con formato inválido', async () => {
      for (const email of ['ana@', 'sin-arroba.com', 'ana @example.com', '']) {
        await expect(service.create({ ...dtoValido, email })).rejects.toThrow(
          BadRequestException,
        );
      }
    });

    it('rechaza zona horaria que no sea un nombre IANA válido', async () => {
      for (const zonaHoraria of [
        'Marte/Olympus_Mons',
        'America/Argentina/Buenos Aires',
        '+05:30',
        'hora_local',
      ]) {
        await expect(
          service.create({ ...dtoValido, zonaHoraria }),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('rechaza campos obligatorios ausentes o vacíos', async () => {
      await expect(
        service.create({ ...dtoValido, nombre: '   ' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ ...dtoValido, nombre: undefined as never }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ ...dtoValido, alias: undefined as never }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza alias ya usado por otra persona', async () => {
      await service.create(dtoValido);

      await expect(
        service.create({
          nombre: 'Otra Persona',
          alias: 'ana_perez',
          email: 'otra@example.com',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza alias repetido aunque cambie la capitalización', async () => {
      await service.create(dtoValido);

      await expect(
        service.create({
          nombre: 'Otra Persona',
          alias: 'Ana_Perez',
          email: 'otra@example.com',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza email ya usado por otra persona', async () => {
      await service.create(dtoValido);

      await expect(
        service.create({
          nombre: 'Otra Persona',
          alias: 'otra_persona',
          email: 'ana@example.com',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza email repetido aunque cambie la capitalización', async () => {
      await service.create(dtoValido);

      await expect(
        service.create({
          nombre: 'Otra Persona',
          alias: 'otra_persona',
          email: 'ANA@example.com',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('no registra la persona cuando la validación falla', async () => {
      await expect(
        service.create({ ...dtoValido, alias: 'x' }),
      ).rejects.toThrow(BadRequestException);

      expect(await service.findAll()).toHaveLength(0);
    });
  });

  describe('findAll / findOne', () => {
    it('devuelve todas las personas registradas', async () => {
      await service.create(dtoValido);
      await service.create({
        ...dtoValido,
        alias: 'otra_persona',
        email: 'otra@example.com',
      });

      expect((await service.findAll()).map((p) => p.alias)).toEqual([
        'ana_perez',
        'otra_persona',
      ]);
    });

    it('devuelve una persona por su id', async () => {
      const creada = await service.create(dtoValido);

      expect(await service.findOne(idDe(creada))).toEqual(creada);
    });

    it('lanza NotFound cuando el id no existe', async () => {
      await expect(service.findOne('99')).rejects.toThrow(NotFoundException);
      await expect(
        service.findOne(new Types.ObjectId().toHexString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('actualiza los campos indicados y conserva el resto', async () => {
      const creada = await service.create(dtoValido);

      const actualizada = await service.update(idDe(creada), {
        nombre: 'Ana P.',
        zonaHoraria: 'America/New_York',
      }, idDe(creada));

      expect(actualizada).toMatchObject({
        nombre: 'Ana P.',
        alias: 'ana_perez',
        email: 'ana@example.com',
        zonaHoraria: 'America/New_York',
      });
    });

    it('lanza BadRequest si el nuevo nombre está vacío', async () => {
      const creada = await service.create(dtoValido);

      await expect(
        service.update(idDe(creada), { nombre: '' }, idDe(creada)),
      ).rejects.toThrow(BadRequestException);
    });

    it('conserva el alias y email al modificar otra persona', async () => {
      await service.create(dtoValido);
      const segunda = await service.create({
        nombre: 'Otra Persona',
        alias: 'otra_persona',
        email: 'otra@example.com',
      });

      const actualizada = await service.update(idDe(segunda), {
        nombre: 'Otro nombre',
      }, idDe(segunda));
      expect(actualizada.alias).toBe('otra_persona');
      expect(actualizada.email).toBe('otra@example.com');
    });

    it('permite conservar el propio alias y email al actualizar', async () => {
      const creada = await service.create(dtoValido);

      const actualizada = await service.update(idDe(creada), {
        nombre: 'Ana Pérez Jr.',
      }, idDe(creada));

      expect(actualizada.nombre).toBe('Ana Pérez Jr.');
    });

    it('lanza NotFound cuando la persona no existe', async () => {
      const id = new Types.ObjectId().toHexString();
      await expect(
        service.update(id, {
          nombre: 'Nadie',
        }, id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('elimina la persona indicada', async () => {
      const creada = await service.create(dtoValido);
      const id = idDe(creada);

      expect(await service.remove(id, id)).toEqual(creada);
      expect(await service.findAll()).toHaveLength(0);
      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFound cuando la persona no existe', async () => {
      const id = new Types.ObjectId().toHexString();
      await expect(
        service.remove(id, id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
