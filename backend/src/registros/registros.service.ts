import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Error as MongooseError, Model, Types, isValidObjectId } from 'mongoose';
import { RegistrarCumplimientoDto } from './dto/registrar-cumplimiento.dto';
import { DeshacerCumplimientoDto } from './dto/deshacer-cumplimiento.dto';
import {
  RegistroCumplimiento,
  RegistroCumplimientoDocumento,
} from './entities/registro-cumplimiento.entity';
import { DesafioDocumento } from '../desafios/entities/desafio.entity';
import { Desafio } from '../desafios/entities/desafio.entity';
import { calcularEstadoDesafio } from '../desafios/entities/desafio.entity';
import { PersonaDocumento } from '../personas/entities/persona.entity';
import { Persona } from '../personas/entities/persona.entity';
import {
  EstadoParticipacion,
  ParticipacionDocumento,
} from '../participaciones/entities/participacion.entity';
import { Participacion } from '../participaciones/entities/participacion.entity';
import { NOTA_MAXIMA } from './registros.constantes';
import { diaEnZona } from '../comun/fechas';

@Injectable()
export class RegistrosService {
  constructor(
    @InjectModel(RegistroCumplimiento.name)
    private readonly registroModelo: Model<RegistroCumplimientoDocumento>,
    @InjectModel(Desafio.name)
    private readonly desafioModelo: Model<DesafioDocumento>,
    @InjectModel(Persona.name)
    private readonly personaModelo: Model<PersonaDocumento>,
    @InjectModel(Participacion.name)
    private readonly participacionModelo: Model<ParticipacionDocumento>,
  ) {}

  /**
   * Registra el cumplimiento de hoy o ayer (según la zona horaria de la
   * persona), dentro del intervalo del desafío y con participación
   * activa. El índice único { persona, desafio, dia } impide duplicados
   * del mismo día.
   */
  async registrar(dto: RegistrarCumplimientoDto): Promise<RegistroCumplimiento> {
    const persona = await this.obtenerPersona(dto.persona);
    const desafio = await this.obtenerDesafio(dto.desafio);
    await this.exigirParticipacionActiva(dto.persona, desafio._id);

    const hoy = diaEnZona(new Date(), persona.zonaHoraria);
    const ayer = diaEnZona(new Date(Date.now() - 86_400_000), persona.zonaHoraria);
    const dia = this.diaPermitido(dto, hoy, ayer);
    if (dia < desafio.fechaInicio || dia > desafio.fechaFin) {
      throw new BadRequestException(
        'No se puede registrar cumplimiento fuera del intervalo del desafío',
      );
    }
    const nota = this.validarNota(dto.nota);
    const valor = this.validarValor(dto.valor);

    try {
      const creado = await this.registroModelo.create({
        persona: persona._id,
        desafio: desafio._id,
        dia,
        nota,
        valor,
      });
      return creado.toObject() as RegistroCumplimiento;
    } catch (error) {
      if (this.esDuplicado(error)) {
        throw new ConflictException(
          `Ya existe un registro para el día ${dia} en este desafío`,
        );
      }
      if (error instanceof MongooseError.ValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

/**
   * Deshace exclusivamente el último registro propio del desafío y solo
   * si corresponde al día actual de la persona. No existen ediciones
   * arbitrarias: los documentos son inmutables.
   */
  async deshacer(dto: DeshacerCumplimientoDto): Promise<RegistroCumplimiento> {
    const persona = await this.obtenerPersona(dto.persona);
    const desafio = await this.obtenerDesafio(dto.desafio);
    const hoy = diaEnZona(new Date(), persona.zonaHoraria);

    const ultimo = await this.registroModelo
      .findOne({ persona: persona._id, desafio: desafio._id })
      .sort({ dia: -1 })
      .lean()
      .exec();
    if (!ultimo) {
      throw new NotFoundException(
        'No existe ningún registro propio en este desafío',
      );
    }
    if (ultimo.dia !== hoy) {
      throw new ForbiddenException(
        'Solo se puede deshacer el último registro propio correspondiente al día actual',
      );
    }
    await this.registroModelo
      .deleteOne({ _id: ultimo._id as Types.ObjectId })
      .exec();
    return ultimo as RegistroCumplimiento;
  }

  /** Historial de registros de un desafío ordenado por día. */
  async listarPorDesafio(desafioId: string): Promise<RegistroCumplimiento[]> {
    const desafio = await this.obtenerDesafio(desafioId);
    return this.registroModelo
      .find({ desafio: desafio._id })
      .sort({ dia: 1 })
      .lean()
      .exec();
  }

  private diaPermitido(
    dto: RegistrarCumplimientoDto & { dia?: string },
    hoy: string,
    ayer: string,
  ): string {
    // El servidor calcula el día desde la zona horaria de la persona.
    // Por defecto registra hoy; `dia: 'ayer'` admite el día anterior
    // (tolerancia para quien registra tarde). Cualquier otro valor se
    // rechaza: no se registra en días arbitrarios.
    const diaSolicitado = dto.dia;
    if (diaSolicitado === undefined || diaSolicitado === 'hoy') {
      return hoy;
    }
    if (diaSolicitado === 'ayer') {
      return ayer;
    }
    throw new BadRequestException(
      'Solo se puede registrar el cumplimiento de hoy o ayer',
    );
  }

  private validarNota(nota: unknown): string | undefined {
    if (nota === undefined) {
      return undefined;
    }
    if (typeof nota !== 'string') {
      throw new BadRequestException('La nota debe ser un texto');
    }
    if (nota.length > NOTA_MAXIMA) {
      throw new BadRequestException('La nota admite 140 caracteres');
    }
    return nota.trim() === '' ? undefined : nota.trim();
  }

  private validarValor(valor: unknown): number | undefined {
    if (valor === undefined) {
      return undefined;
    }
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
      throw new BadRequestException(
        'El valor debe ser un número finito no negativo',
      );
    }
    return valor;
  }

  private async exigirParticipacionActiva(
    personaId: string,
    desafioId: Types.ObjectId,
  ): Promise<void> {
    const participacion = await this.participacionModelo
      .findOne({
        persona: new Types.ObjectId(personaId),
        desafio: desafioId,
        estado: EstadoParticipacion.ACTIVA,
      })
      .lean()
      .exec();
    if (!participacion) {
      throw new ForbiddenException(
        'Solo las participaciones activas pueden registrar cumplimiento',
      );
    }
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

  private async obtenerDesafio(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Desafío #${id} no encontrado`);
    }
    const desafio = await this.desafioModelo.findById(id).lean().exec();
    if (!desafio) {
      throw new NotFoundException(`Desafío #${id} no encontrado`);
    }
    if (calcularEstadoDesafio(desafio) === 'CANCELADO') {
      throw new BadRequestException(
        'No se puede registrar cumplimiento en un desafío cancelado',
      );
    }
    return desafio;
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
