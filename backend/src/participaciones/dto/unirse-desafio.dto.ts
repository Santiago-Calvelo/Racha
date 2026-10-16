import { IsMongoId, Matches } from 'class-validator';

export class UnirseDesafioDto {
  /** Id de la persona que se une al desafío. */
  @IsMongoId()
  persona: string;
  @Matches(/^[A-Z0-9]{6}$/)
  codigoInvitacion: string;
}
