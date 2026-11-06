import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ZONA_HORARIA_POR_DEFECTO } from '../../comun/constantes';
import { esZonaHorariaValida } from '../../comun/fechas';

export type PersonaDocumento = HydratedDocument<Persona>;

/**
 * Esquema `Persona` (colección `personas`).
 * Alias único al completar el perfil. La identidad social se vincula por
 * emisor/sujeto; el email solo es único entre perfiles antiguos sin emisor.
 */
@Schema({ collection: 'personas' })
export class Persona {
  @Prop({ required: [true, 'El nombre es obligatorio'], trim: true })
  nombre: string;

  @Prop({
    trim: true,
    lowercase: true,
    minlength: [3, 'El alias debe tener entre 3 y 20 caracteres'],
    maxlength: [20, 'El alias debe tener entre 3 y 20 caracteres'],
    match: [
      /^[A-Za-z0-9_]{3,20}$/,
      'El alias solo puede contener letras ASCII, números y guion bajo',
    ],
  })
  alias: string;

  @Prop({
    trim: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'El email no tiene un formato válido',
    ],
  })
  email: string;

  @Prop({ immutable: true })
  emisor?: string;
  @Prop({ immutable: true })
  sujeto?: string;
  @Prop({ immutable: true })
  proveedor?: string;

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
PersonaEsquema.index({ alias: 1 }, { unique: true, partialFilterExpression: { alias: { $type: 'string' } } });
// Las identidades externas nunca se vinculan por coincidencia de email.
PersonaEsquema.index({ email: 1 }, { unique: true, name: 'email_legacy_unique', partialFilterExpression: { emisor: null } });
PersonaEsquema.index({ emisor: 1, sujeto: 1 }, { unique: true, partialFilterExpression: { sujeto: { $type: 'string' } } });
