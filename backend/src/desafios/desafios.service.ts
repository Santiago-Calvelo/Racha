import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  Connection,
  Error as MongooseError,
  Model,
  Types,
  isValidObjectId,
} from 'mongoose';
import { CrearDesafioDto } from './dto/crear-desafio.dto';
import { ActualizarDesafioDto } from './dto/actualizar-desafio.dto';
import {
  Desafio,
  DesafioDocumento,
  calcularEstadoDesafio,
} from './entities/desafio.entity';
import { Persona, PersonaDocumento } from '../personas/entities/persona.entity';
import {
  EstadoParticipacion,
  Participacion,
  ParticipacionDocumento,
} from '../participaciones/entities/participacion.entity';
import { MAXIMO_DESAFIOS_VIGENTES_POR_PERSONA } from '../comun/constantes';
import { generarCodigoInvitacion, hoyReferencia } from '../comun/fechas';
import {
  REINTENTOS_CODIGO,
  validarCategoria,
  validarDescripcion,
  validarFechasYCupo,
  validarNombre,
} from './desafios.validadores';

@Injectable()
export class DesafiosService {
  constructor(
    @InjectModel(Desafio.name)
    private readonly desafioModelo: Model<DesafioDocumento>,
    @InjectModel(Persona.name)
    private readonly personaModelo: Model<PersonaDocumento>,
    @InjectModel(Participacion.name)
    private readonly participacionModelo: Model<ParticipacionDocumento>,
    @InjectConnection() private readonly conexion: Connection,
  ) {}

  /**
   * Crea un desafío con código de invitación generado en el servidor.
   * Las colisiones de código se resuelven reintentando ante el error de
   * clave duplicada de Mongo (índice único), no con una consulta previa
   * que dejaría una ventana de carrera. El creador queda registrado como
   * participante dentro de la misma transacción.
   */
  async crear(dto: CrearDesafioDto): Promise<Desafio> {
    const creador = await this.obtenerPersona(dto.creador);
    const datos = validarFechasYCupo(dto, hoyReferencia());
    await this.verificarTopeVigentes(dto.creador);

    let ultimoError: unknown = null;
    for (let intento = 0; intento < REINTENTOS_CODIGO; intento += 1) {
      const sesion = await this.conexion.startSession();
      try {
        return await sesion.withTransaction(async () => {
          const creados = await this.desafioModelo.create(
            [
              {
                nombre: datos.nombre,
                descripcion: datos.descripcion,
                categoria: datos.categoria,
                fechaInicio: datos.fechaInicio,
                fechaFin: datos.fechaFin,
                maximoParticipantes: datos.maximoParticipantes,
                codigoInvitacion: generarCodigoInvitacion(),
                creador: creador._id,
                fechaCancelacion: null,
              },
            ],
            { session: sesion },
          );
          await this.participacionModelo.create(
            [
              {
                persona: creador._id,
                desafio: creados[0]._id,
                estado: EstadoParticipacion.ACTIVA,
                fechaIngreso: new Date(),
                fechaAbandono: null,
              },
            ],
            { session: sesion },
          );
          return creados[0].toObject() as Desafio;
        });
      } catch (error) {
        if (this.esDuplicado(error, 'codigoInvitacion')) {
          ultimoError = error;
          continue;
        }
        throw this.traducirError(error);
      } finally {
        await sesion.endSession();
      }
    }
    throw new ConflictException(
      'No se pudo generar un código de invitación único, reintentá la creación',
      { cause: ultimoError as Error },
    );
  }

  async listar(): Promise<Desafio[]> {
    return this.desafioModelo.find().lean().exec();
  }

  async obtener(id: string): Promise<Desafio> {
    const desafio = await this.buscarPorId(id);
    if (!desafio) {
      throw new NotFoundException(`Desafío #${id} no encontrado`);
    }
    return desafio;
  }

/**
   * Modifica nombre, descripción, categoría, fechas y cupo únicamente
   * mientras el desafío esté PROGRAMADO. No permite reducir el cupo por
   * debajo de los participantes activos.
   */
  async actualizar(id: string, dto: ActualizarDesafioDto): Promise<Desafio> {
    const desafio = await this.desafioModelo
      .findById(this.aObjectId(id))
      .exec();
    if (!desafio) {
      throw new NotFoundException(`Desafío #${id} no encontrado`);
    }
    if (calcularEstadoDesafio(desafio.toObject()) !== 'PROGRAMADO') {
      throw new BadRequestException(
        'Solo se pueden modificar las fechas y los cupos mientras el desafío esté programado',
      );
    }

    const nombre = dto.nombre === undefined ? desafio.nombre : validarNombre(dto.nombre);
    if (dto.descripcion !== undefined) {
      validarDescripcion(dto.descripcion);
    }
    if (dto.categoria !== undefined) {
      validarCategoria(dto.categoria);
    }
    const fechas = validarFechasYCupo(
      {
        fechaInicio: dto.fechaInicio ?? desafio.fechaInicio,
        fechaFin: dto.fechaFin ?? desafio.fechaFin,
        maximoParticipantes:
          dto.maximoParticipantes ?? desafio.maximoParticipantes,
      },
      hoyReferencia(),
    );
    if (dto.maximoParticipantes !== undefined) {
      const activos = await this.contarActivos(desafio._id);
      if (dto.maximoParticipantes < activos) {
        throw new BadRequestException(
          `No se puede reducir el cupo por debajo de los ${activos} participantes activos`,
        );
      }
    }

    desafio.nombre = nombre;
    if (dto.descripcion !== undefined) {
      desafio.descripcion = validarDescripcion(dto.descripcion);
    }
    if (dto.categoria !== undefined) {
      desafio.categoria = validarCategoria(dto.categoria);
    }
    desafio.fechaInicio = fechas.fechaInicio;
    desafio.fechaFin = fechas.fechaFin;
    desafio.maximoParticipantes = fechas.maximoParticipantes;
    try {
      await desafio.save();
    } catch (error) {
      throw this.traducirError(error);
    }
    return desafio.toObject() as Desafio;
  }

  /**
   * Cancela un desafío programado o activo. Solo el creador puede
   * cancelarlo. Se persiste `fechaCancelacion`; el estado CANCELADO se
   * calcula desde ese campo.
   */
  async cancelar(id: string, creador: string): Promise<Desafio> {
    const desafio = await this.desafioModelo
      .findById(this.aObjectId(id))
      .exec();
    if (!desafio) {
      throw new NotFoundException(`Desafío #${id} no encontrado`);
    }
    if (String(desafio.creador) !== creador) {
      throw new ForbiddenException(
        'Solo el creador puede cancelar el desafío',
      );
    }
    const estado = calcularEstadoDesafio(desafio.toObject());
    if (estado !== 'PROGRAMADO' && estado !== 'ACTIVO') {
      throw new BadRequestException(
        'Solo se pueden cancelar desafíos programados o activos',
      );
    }
    desafio.fechaCancelacion = new Date();
    await desafio.save();
    return desafio.toObject() as Desafio;
  }

  private async obtenerPersona(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Persona #${id} no encontrada`);
    }
    const persona = await this.personaModelo.findById(id).exec();
    if (!persona) {
      throw new NotFoundException(`Persona #${id} no encontrada`);
    }
    return persona;
  }

  private buscarPorId(id: string): Promise<Desafio | null> {
    const objectId = this.aObjectId(id);
    if (!objectId) {
      return Promise.resolve(null);
    }
    return this.desafioModelo.findById(objectId).lean().exec();
  }

  private aObjectId(id: string): Types.ObjectId | null {
    if (!isValidObjectId(id)) {
      return null;
    }
    return new Types.ObjectId(id);
  }

  /**
   * Tope de 5 desafíos vigentes (programados o activos, es decir con
   * `fechaFin` no anterior a hoy y sin cancelar) por persona, contando
   * los creados. Se cuenta por aplicación porque el estado es calculado;
   * la concurrencia exacta requeriría una colección de contadores con
   * actualización atómica (ver README).
   */
  private async verificarTopeVigentes(persona: string): Promise<void> {
    const hoy = hoyReferencia();
    const vigentes = await this.desafioModelo
      .countDocuments({
        creador: new Types.ObjectId(persona),
        fechaCancelacion: null,
        fechaFin: { $gte: hoy },
      })
      .exec();
    if (vigentes >= MAXIMO_DESAFIOS_VIGENTES_POR_PERSONA) {
      throw new ForbiddenException(
        `Cada persona puede tener hasta ${MAXIMO_DESAFIOS_VIGENTES_POR_PERSONA} desafíos vigentes, contando los creados`,
      );
    }
  }

  private contarActivos(desafio: Types.ObjectId): Promise<number> {
    return this.participacionModelo
      .countDocuments({ desafio, estado: EstadoParticipacion.ACTIVA })
      .exec();
  }

  private esDuplicado(error: unknown, campo: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code === 11000 &&
      campo in
        ((error as { keyValue?: Record<string, unknown> }).keyValue ?? {})
    );
  }

  private traducirError(error: unknown): Error {
    if (error instanceof MongooseError.ValidationError) {
      throw new BadRequestException(error.message);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}
