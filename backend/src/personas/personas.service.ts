import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Error as MongooseError, Model, isValidObjectId } from 'mongoose';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { Persona, PersonaDocumento } from './entities/persona.entity';
import { ZONA_HORARIA_POR_DEFECTO } from '../comun/constantes';
import { esZonaHorariaValida } from '../comun/fechas';
import { exigirMismaPersona } from '../comun/permisos';

/** Alias: 3 a 20 caracteres, solo letras ASCII, números y guion bajo. */
const ALIAS_REGEX = /^[A-Za-z0-9_]{3,20}$/;

/** Formato básico de email local@dominio.tld. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface DatosPersona {
  nombre: string;
  alias: string;
  email: string;
  zonaHoraria: string;
}

@Injectable()
export class PersonasService {
  constructor(
    @InjectModel(Persona.name)
    private readonly personaModelo: Model<PersonaDocumento>,
  ) {}

  async create(createPersonaDto: CreatePersonaDto): Promise<Persona> {
    const datos = this.validar({
      nombre: createPersonaDto.nombre,
      alias: createPersonaDto.alias,
      email: createPersonaDto.email,
      zonaHoraria: createPersonaDto.zonaHoraria,
    });

    try {
      return await this.personaModelo.create(datos);
    } catch (error) {
      throw this.traducirError(error, datos);
    }
  }

  findAll(): Promise<Persona[]> {
    return this.personaModelo.find().lean().exec();
  }

  async findOne(id: string): Promise<Persona> {
    const persona = await this.buscarPorId(id);
    if (!persona) {
      throw new NotFoundException(`Persona #${id} no encontrada`);
    }
    return persona;
  }

  async update(
    id: string,
    updatePersonaDto: UpdatePersonaDto,
    usuarioId: string,
  ): Promise<Persona> {
    exigirMismaPersona(usuarioId, id);
    const actual = await this.buscarPorId(id);
    if (!actual) {
      throw new NotFoundException(`Persona #${id} no encontrada`);
    }

    const nombre = this.campoObligatorio(updatePersonaDto.nombre ?? actual.nombre, 'nombre');
    const zonaHoraria = updatePersonaDto.zonaHoraria ?? actual.zonaHoraria;
    if (!esZonaHorariaValida(zonaHoraria)) throw new BadRequestException('La zona horaria no es un nombre IANA válido');
    const datos = { nombre, zonaHoraria };

    try {
      const actualizada = await this.personaModelo
        .findByIdAndUpdate(id, datos, { new: true, runValidators: true })
        .lean()
        .exec();
      if (!actualizada) {
        throw new NotFoundException(`Persona #${id} no encontrada`);
      }
      return actualizada;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw this.traducirError(error, { ...actual, ...datos });
    }
  }

  async remove(id: string, usuarioId: string): Promise<Persona> {
    exigirMismaPersona(usuarioId, id);
    const eliminada = await this.buscarPorId(id);
    if (!eliminada) {
      throw new NotFoundException(`Persona #${id} no encontrada`);
    }
    await this.personaModelo.findByIdAndDelete(id).exec();
    return eliminada;
  }

  private buscarPorId(id: string): Promise<Persona | null> {
    if (!isValidObjectId(id)) {
      return Promise.resolve(null);
    }
    return this.personaModelo.findById(id).lean().exec();
  }

  /**
   * Normaliza y valida todos los campos. Lanza `BadRequestException` ante
   * cualquier dato inválido. Una zona horaria ausente o vacía se reemplaza
   * por `ZONA_HORARIA_POR_DEFECTO`.
   */
  private validar(entrada: {
    nombre: unknown;
    alias: unknown;
    email: unknown;
    zonaHoraria: unknown;
  }): DatosPersona {
    const nombre = this.campoObligatorio(entrada.nombre, 'nombre');

    const alias = this.campoObligatorio(entrada.alias, 'alias');
    if (!ALIAS_REGEX.test(alias)) {
      throw new BadRequestException(
        'El alias debe tener entre 3 y 20 caracteres y solo puede contener letras ASCII, números y guion bajo',
      );
    }

    const email = this.campoObligatorio(entrada.email, 'email');
    if (!EMAIL_REGEX.test(email)) {
      throw new BadRequestException(
        `El email "${email}" no tiene un formato válido`,
      );
    }

    const zonaHoraria =
      typeof entrada.zonaHoraria === 'string' &&
      entrada.zonaHoraria.trim() !== ''
        ? entrada.zonaHoraria.trim()
        : ZONA_HORARIA_POR_DEFECTO;
    if (!esZonaHorariaValida(zonaHoraria)) {
      throw new BadRequestException(
        `La zona horaria "${zonaHoraria}" no es un nombre IANA válido`,
      );
    }

    // La normalización a minúsculas también la aplica el esquema
    // (`lowercase: true`); se hace aquí para mensajes coherentes.
    return {
      nombre,
      alias: alias.toLowerCase(),
      email: email.toLowerCase(),
      zonaHoraria,
    };
  }

  private campoObligatorio(valor: unknown, campo: string): string {
    if (typeof valor !== 'string' || valor.trim() === '') {
      throw new BadRequestException(`El campo "${campo}" es obligatorio`);
    }
    return valor.trim();
  }

  /**
   * Traduce errores de Mongo/Mongoose a excepciones HTTP sin exponer
   * detalles internos: duplicados (código 11000) a `ConflictException`
   * y errores de validación a `BadRequestException`.
   */
  private traducirError(error: unknown, datos: DatosPersona): Error {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code === 11000
    ) {
      const campos = Object.keys(
        (error as { keyValue?: Record<string, unknown> }).keyValue ?? {},
      );
      if (campos.includes('email')) {
        throw new ConflictException(`El email "${datos.email}" ya está en uso`);
      }
      throw new ConflictException(`El alias "${datos.alias}" ya está en uso`);
    }
    if (error instanceof MongooseError.ValidationError) {
      throw new BadRequestException(error.message);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}
