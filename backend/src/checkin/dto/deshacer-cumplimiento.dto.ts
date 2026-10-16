import { IsMongoId } from 'class-validator';

export class DeshacerCumplimientoDto {
  /** Id de la persona dueña del checkin. */
  @IsMongoId()
  persona: string;
  /** Id del desafío. */
  @IsMongoId()
  desafio: string;
}
