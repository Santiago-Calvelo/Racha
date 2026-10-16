import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  ValidateBy,
  ValidateIf,
} from 'class-validator';
import { esZonaHorariaValida } from '../../comun/fechas';

export class CreatePersonaDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  nombre: string;
  @IsString()
  @Matches(/^[A-Za-z0-9_]{3,20}$/)
  alias: string;
  @IsEmail()
  email: string;
  /** Nombre IANA, p. ej. `America/Argentina/Buenos_Aires`. Opcional: si se omite se usa la zona por defecto. */
  @ValidateIf((_, value: unknown) => value !== undefined)
  @ValidateBy({
    name: 'zonaHoraria',
    validator: { validate: esZonaHorariaValida },
  })
  zonaHoraria?: string;
}
