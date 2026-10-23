import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

/** Estado de una participación. */
export enum EstadoParticipacion {
  ACTIVA = 'ACTIVA',
  ABANDONADA = 'ABANDONADA',
}

export type ParticipacionDocumento = HydratedDocument<Participacion>;

/**
 * Esquema `Participacion` (colección `participaciones`).
 * El par persona+desafío es único: quien abandona conserva su documento
 * histórico y no puede volver a unirse.
 */
@Schema({ collection: 'participaciones' })
export class Participacion {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Persona',
    required: true,
    immutable: true,
  })
  persona: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Desafio',
    required: true,
    immutable: true,
  })
  desafio: Types.ObjectId;

  @Prop({
    required: true,
    enum: Object.values(EstadoParticipacion),
    default: EstadoParticipacion.ACTIVA,
  })
  estado: EstadoParticipacion;

  @Prop({ type: Date, required: true, default: () => new Date() })
  fechaIngreso: Date;

  @Prop({ type: Date, default: null })
  fechaAbandono: Date | null;
}

export const ParticipacionEsquema = SchemaFactory.createForClass(Participacion);

/** Una persona participa una sola vez por desafío (activa o histórica). */
ParticipacionEsquema.index({ persona: 1, desafio: 1 }, { unique: true });

/** Cupo activo y ranking: solo importan las participaciones activas. */
ParticipacionEsquema.index({ desafio: 1, estado: 1 });
