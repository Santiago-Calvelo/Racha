import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  DURACION_MAXIMA_DIAS,
  DURACION_MINIMA_DIAS,
} from '../../comun/constantes';
import { duracionEnDias, esDiaValido, hoyReferencia } from '../../comun/fechas';

/** Categorías de desafío. */
export enum CategoriaDesafio {
  SALUD = 'SALUD',
  ESTUDIO = 'ESTUDIO',
  FINANZAS = 'FINANZAS',
  BIENESTAR = 'BIENESTAR',
  OTRO = 'OTRO',
}

/** Estados temporales calculados (nunca persistidos). */
export type EstadoDesafio = 'PROGRAMADO' | 'ACTIVO' | 'FINALIZADO' | 'CANCELADO';

export type DesafioDocumento = HydratedDocument<Desafio>;

/**
 * Esquema `Desafio` (colección `desafios`).
 * El estado temporal se calcula desde las fechas y `fechaCancelacion`.
 */
@Schema({ collection: 'desafios' })
export class Desafio {
  @Prop({
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    minlength: [3, 'El nombre debe tener entre 3 y 60 caracteres'],
    maxlength: [60, 'El nombre debe tener entre 3 y 60 caracteres'],
  })
  nombre: string;

  @Prop({ trim: true, maxlength: [280, 'La descripción admite 280 caracteres'] })
  descripcion?: string;

  @Prop({
    required: [true, 'La categoría es obligatoria'],
    enum: Object.values(CategoriaDesafio),
  })
  categoria: CategoriaDesafio;

  @Prop({
    required: [true, 'La fecha de inicio es obligatoria'],
    validate: [
      {
        validator: (valor: string) => esDiaValido(valor),
        message: 'La fecha de inicio debe ser un día real con formato YYYY-MM-DD',
      },
      {
        validator: (valor: string) =>
          esDiaValido(valor) && valor >= hoyReferencia(),
        message: 'El desafío no puede comenzar en el pasado',
      },
    ],
  })
  fechaInicio: string;

  @Prop({
    required: [true, 'La fecha de fin es obligatoria'],
    validate: {
      validator: function (este: { fechaInicio: string }, valor: string) {
        return (
          esDiaValido(valor) &&
          esDiaValido(este.fechaInicio) &&
          valor >= este.fechaInicio &&
          duracionEnDias(este.fechaInicio, valor) >= DURACION_MINIMA_DIAS &&
          duracionEnDias(este.fechaInicio, valor) <= DURACION_MAXIMA_DIAS
        );
      },
      message: `El desafío debe durar entre ${DURACION_MINIMA_DIAS} y ${DURACION_MAXIMA_DIAS} días, contando inicio y fin`,
    },
  })
  fechaFin: string;

  @Prop({
    required: true,
    default: 10,
    min: [2, 'El máximo de participantes es entre 2 y 20'],
    max: [20, 'El máximo de participantes es entre 2 y 20'],
    validate: {
      validator: Number.isInteger,
      message: 'El máximo de participantes debe ser un entero',
    },
  })
  maximoParticipantes: number;

  @Prop({
    required: [true, 'El código de invitación es obligatorio'],
    minlength: 6,
    maxlength: 6,
    unique: true,
  })
  codigoInvitacion: string;

  @Prop({ type: Types.ObjectId, ref: 'Persona', required: true, immutable: true })
  creador: Types.ObjectId;

  @Prop({ type: Date, default: null })
  fechaCancelacion: Date | null;
}

export const DesafioEsquema = SchemaFactory.createForClass(Desafio);

/**
 * Calcula el estado global en la zona horaria de referencia
 * (`America/Argentina/Buenos_Aires`): no depende de la zona de cada
 * participante. `CANCELADO` se representa con `fechaCancelacion`.
 */
export function calcularEstadoDesafio(
  desafio: {
    fechaInicio: string;
    fechaFin: string;
    fechaCancelacion: Date | null;
  },
  hoy = hoyReferencia(),
): EstadoDesafio {
  if (desafio.fechaCancelacion !== null && desafio.fechaCancelacion !== undefined) {
    return 'CANCELADO';
  }
  if (hoy < desafio.fechaInicio) {
    return 'PROGRAMADO';
  }
  if (hoy > desafio.fechaFin) {
    return 'FINALIZADO';
  }
  return 'ACTIVO';
}
