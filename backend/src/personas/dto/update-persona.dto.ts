import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreatePersonaDto } from './create-persona.dto';

export class UpdatePersonaDto extends PartialType(
  PickType(CreatePersonaDto, ['nombre', 'zonaHoraria'] as const),
  { skipNullProperties: false },
) {}
