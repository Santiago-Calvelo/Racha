import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types, isValidObjectId } from 'mongoose';
import { UnirseDesafioDto } from './dto/unirse-desafio.dto';
import {
  EstadoParticipacion,
  Participacion,
  ParticipacionDocumento,
} from './entities/participacion.entity';
import {
  Desafio,
  DesafioDocumento,
  calcularEstadoDesafio,
} from '../desafios/entities/desafio.entity';
import { Persona, PersonaDocumento } from '../personas/entities/persona.entity';

@Injectable()
export class ParticipacionesService {
  constructor(
    @InjectModel(Participacion.name)
    private readonly participacionModelo: Model<ParticipacionDocumento>,
    @InjectModel(Desafio.name)
    private readonly desafioModelo: Model<DesafioDocumento>,
    @InjectModel(Persona.name)
    private readonly personaModelo: Model<PersonaDocumento>,
    @InjectConnection() private readonly conexion: Connection,
  ) {}

  /**
   * Une una persona a un desafío vigente (programado o activo, sin
   * cancelar). El índice único { persona, desafio } impide reingresos:
   * quien abandonó conserva su documento y no puede volver. El cupo de
   * activos se controla con actualización atómica dentro de la
   * transacción: se cuenta y se inserta en la misma sesión.
   */
  async unirse(desafioId: string, dto: UnirseDesafioDto): Promise<Participacion> {
    const desafio = await this.obtenerDesafio(desafioId);
    await this.obtenerPersona(dto.persona);
    const estado = calcularEstadoDesafio(desafio);
    if (estado !== 'PROGRAMADO' && estado !== 'ACTIVO') {
      throw new BadRequestException(
        'No es posible unirse a un desafío finalizado o cancelado',
      );
    }

    const sesion = await this.conexion.startSession();
    try {
      return await sesion.withTransaction(async () => {
        const activos = await this.participacionModelo.countDocuments(
          {
            desafio: desafio._id,
            estado: EstadoParticipacion.ACTIVA,
          },
          { session: sesion },
        );
        if (activos >= desafio.maximoParticipantes) {
          throw new ForbiddenException('El desafío alcanzó su cupo máximo');
        }
        try {
          const creadas = await this.participacionModelo.create(
            [
              {
                persona: new Types.ObjectId(dto.persona),
                desafio: desafio._id,
                estado: EstadoParticipacion.ACTIVA,
                fechaIngreso: new Date(),
                fechaAbandono: null,
              },
            ],
            { session: sesion },
          );
          return creadas[0].toObject() as Participacion;
        } catch (error) {
          if (this.esDuplicado(error)) {
            throw new ConflictException(
              'La persona ya participa o participó en este desafío y no puede volver a unirse',
            );
          }
          throw error;
        }
      });
    } finally {
      await sesion.endSession();
    }
  }

  /**
   * Abandona un desafío: conserva el documento histórico con estado
   * ABANDONADA. El creador no puede abandonar su propio desafío. Quien
   * abandonó no ocupa cupo activo ni aparece en el ranking.
   */
  async abandonar(desafioId: string, personaId: string): Promise<Participacion> {
    const desafio = await this.obtenerDesafio(desafioId);
    if (String(desafio.creador) === personaId) {
      throw new ForbiddenException(
        'La persona creadora no puede abandonar su propio desafío',
      );
    }
    const participacion = await this.participacionModelo
      .findOne({
        persona: this.aObjectId(personaId),
        desafio: desafio._id,
        estado: EstadoParticipacion.ACTIVA,
      })
      .exec();
    if (!participacion) {
      throw new NotFoundException(
        'No existe una participación activa de esta persona en el desafío',
      );
    }
    participacion.estado = EstadoParticipacion.ABANDONADA;
    participacion.fechaAbandono = new Date();
    await participacion.save();
    return participacion.toObject() as Participacion;
  }

  /** Participantes activos de un desafío (para ranking y cupo). */
  async listarActivas(desafioId: string): Promise<Participacion[]> {
    const desafio = await this.obtenerDesafio(desafioId);
    return this.participacionModelo
      .find({ desafio: desafio._id, estado: EstadoParticipacion.ACTIVA })
      .lean()
      .exec();
  }

  private async obtenerDesafio(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Desafío #${id} no encontrado`);
    }
    const desafio = await this.desafioModelo.findById(id).lean().exec();
    if (!desafio) {
      throw new NotFoundException(`Desafío #${id} no encontrado`);
    }
    return desafio;
  }

  private async obtenerPersona(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Persona #${id} no encontrada`);
    }
    const persona = await this.personaModelo.findById(id).lean().exec();
    if (!persona) {
      throw new NotFoundException(`Persona #${id} no encontrada`);
    }
    return persona;
  }

  private aObjectId(id: string): Types.ObjectId | null {
    if (!isValidObjectId(id)) {
      return null;
    }
    return new Types.ObjectId(id);
  }

  private esDuplicado(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code === 11000
    );
  }
}
