import { OmitType, PartialType, PickType } from '@nestjs/mapped-types';
import { CrearDesafioDto } from './crear-desafio.dto';

export class ActualizarDesafioDto extends PartialType(
  OmitType(CrearDesafioDto, ['creador'] as const),
  { skipNullProperties: false },
) {}

export class CancelarDesafioDto extends PickType(CrearDesafioDto, [
  'creador',
] as const) {}
