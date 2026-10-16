import {
  IsIn,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { DeshacerCumplimientoDto } from './deshacer-cumplimiento.dto';
import { NOTA_MAXIMA } from '../checkin.constantes';

export class RegistrarCumplimientoDto extends DeshacerCumplimientoDto {
  /** Día a registrar: `hoy` (defecto) o `ayer`, según la zona de la persona. */
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsIn(['hoy', 'ayer'])
  dia?: string;
  /** Texto opcional, máximo 140 caracteres. */
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(NOTA_MAXIMA)
  nota?: string;
  /** Número opcional, finito y no negativo. */
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  valor?: number;
}
