import { CategoriaDesafio } from '../entities/desafio.entity';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CrearDesafioDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 60)
  nombre: string;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(280)
  descripcion?: string;
  @IsEnum(CategoriaDesafio)
  categoria: CategoriaDesafio;
  /** Día calendario `YYYY-MM-DD`, no anterior a hoy (zona de referencia). */
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  fechaInicio: string;
  /** Día calendario `YYYY-MM-DD`, duración total entre 3 y 90 días. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  fechaFin: string;
  /** Entero entre 2 y 20. Opcional: 10 por defecto. */
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsInt()
  @Min(2)
  @Max(20)
  maximoParticipantes?: number;
  /** Id de la persona creadora (también queda como participante). */
  @IsMongoId()
  creador: string;
}

export class FiltrarDesafiosDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsEnum(CategoriaDesafio)
  categoria?: CategoriaDesafio;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @Matches(/^(PROGRAMADO|ACTIVO|FINALIZADO|CANCELADO)$/)
  estado?: 'PROGRAMADO' | 'ACTIVO' | 'FINALIZADO' | 'CANCELADO';
}
