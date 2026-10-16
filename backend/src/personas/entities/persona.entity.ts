import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ZONA_HORARIA_POR_DEFECTO } from '../../comun/constantes';
import { esZonaHorariaValida } from '../../comun/fechas';

export type PersonaDocumento = HydratedDocument<Persona>;

/**
 * Esquema `Persona` (colección `personas`).
 * Alias y email se normalizan a minúsculas y son únicos mediante
 * índices reales de MongoDB, no solo validación de Mongoose.
 */
@Schema({ collection: 'personas' })
export class Persona {
  @Prop({ required: [true, 'El nombre es obligatorio'], trim: true })
  nombre: string;

  @Prop({
    required: [true, 'El alias es obligatorio'],
    trim: true,
    lowercase: true,
    unique: true,
    minlength: [3, 'El alias debe tener entre 3 y 20 caracteres'],
    maxlength: [20, 'El alias debe tener entre 3 y 20 caracteres'],
    match: [
      /^[A-Za-z0-9_]{3,20}$/,
      'El alias solo puede contener letras ASCII, números y guion bajo',
    ],
  })
  alias: string;

  @Prop({
    required: [true, 'El email es obligatorio'],
    trim: true,
    lowercase: true,
    unique: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'El email no tiene un formato válido',
    ],
  })
  email: string;

  /** Nombre IANA, p. ej. `America/Argentina/Buenos_Aires`. */
  @Prop({
    required: true,
    trim: true,
    default: ZONA_HORARIA_POR_DEFECTO,
    validate: {
      validator: (valor: string) => esZonaHorariaValida(valor),
      message: (props: { value: string }) =>
        `La zona horaria "${props.value}" no es un nombre IANA válido`,
    },
  })
  zonaHoraria: string;
}

export const PersonaEsquema = SchemaFactory.createForClass(Persona);
