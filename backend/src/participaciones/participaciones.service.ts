import {
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
import { verificarTopeVigentes } from '../comun/limite-desafios';
import { exigirMismaPersona } from '../comun/permisos';

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
   * activos se controla escribiendo el desafío antes del conteo dentro
   * de la transacción; el límite de vigentes se coordina por persona.
   */
  async unirse(dto: UnirseDesafioDto, usuarioId: string): Promise<Participacion> {
    exigirMismaPersona(usuarioId, dto.persona);
    await this.obtenerPersona(dto.persona);
    const desafio = await this.desafioModelo
      .findOne({ codigoInvitacion: dto.codigoInvitacion })
      .lean()
      .exec();
    if (!desafio) {
      throw new NotFoundException(
        'No existe un desafío con ese código de invitación',
      );
    }
    const estado = calcularEstadoDesafio(desafio);
    if (estado !== 'PROGRAMADO' && estado !== 'ACTIVO') {
      throw new ConflictException(
        'No es posible unirse a un desafío finalizado o cancelado',
      );
    }

    const sesion = await this.conexion.startSession();
    try {
      return await sesion.withTransaction(async () => {
        const actual = await this.desafioModelo
          .findOneAndUpdate(
            { _id: desafio._id },
            { $inc: { __v: 1 } },
            { new: true, session: sesion },
          )
          .exec();
        if (!actual) throw new NotFoundException('Desafío no encontrado');
        const estadoActual = calcularEstadoDesafio(actual);
        if (estadoActual !== 'PROGRAMADO' && estadoActual !== 'ACTIVO') {
          throw new ConflictException(
            'No es posible unirse a un desafío finalizado o cancelado',
          );
        }
        await verificarTopeVigentes(
          new Types.ObjectId(dto.persona),
          {
            personas: this.personaModelo,
            desafios: this.desafioModelo,
            participaciones: this.participacionModelo,
          },
          sesion,
        );
        const activos = await this.participacionModelo.countDocuments(
          {
            desafio: desafio._id,
            estado: EstadoParticipacion.ACTIVA,
          },
          { session: sesion },
        );
        if (activos >= actual.maximoParticipantes) {
          throw new ConflictException('El desafío alcanzó su cupo máximo');
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
  async abandonar(
    desafioId: string,
    personaId: string,
    usuarioId: string,
  ): Promise<Participacion> {
    exigirMismaPersona(usuarioId, personaId);
    const desafio = await this.obtenerDesafio(desafioId);
    await this.obtenerPersona(personaId);
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
    if (String(desafio.creador) === personaId) {
      throw new ForbiddenException(
        'La persona creadora no puede abandonar su propio desafío',
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
      .populate('persona', 'nombre alias email zonaHoraria')
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
