import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { esDiaValido } from '../../comun/fechas';

export type CheckinDocumento = HydratedDocument<Checkin>;

/**
 * Esquema `Checkin` (colección `registros_cumplimiento`).
 * El día se guarda como texto `YYYY-MM-DD` según la zona horaria de la
 * persona, no como `Date`, para evitar desplazamientos por conversiones
 * de zona horaria. Los documentos son inmutables: no se editan, solo se
 * puede deshacer el último del día actual.
 */
@Schema({ collection: 'registros_cumplimiento' })
export class Checkin {
  @Prop({
    type: Types.ObjectId,
    ref: 'Persona',
    required: true,
    immutable: true,
  })
  persona: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Desafio',
    required: true,
    immutable: true,
  })
  desafio: Types.ObjectId;

  @Prop({
    required: [true, 'El día es obligatorio'],
    immutable: true,
    validate: {
      validator: (valor: string) => esDiaValido(valor),
      message: 'El día debe ser una fecha real con formato YYYY-MM-DD',
    },
  })
  dia: string;

  @Prop({ trim: true, maxlength: [140, 'La nota admite 140 caracteres'] })
  nota?: string;

  @Prop({
    immutable: true,
    validate: {
      validator: (valor: number | undefined) =>
        valor === undefined || (Number.isFinite(valor) && valor >= 0),
      message: 'El valor debe ser un número finito no negativo',
    },
  })
  valor?: number;
}

export const CheckinEsquema = SchemaFactory.createForClass(Checkin);

/** Un checkin diario por persona y desafío. */
CheckinEsquema.index({ persona: 1, desafio: 1, dia: 1 }, { unique: true });

/** Historial y ranking por desafío ordenados por día. */
CheckinEsquema.index({ desafio: 1, dia: 1 });
