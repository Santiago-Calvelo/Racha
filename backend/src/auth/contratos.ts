import { OmitType } from '@nestjs/mapped-types';
import { CrearDesafioDto } from '../desafios/dto/crear-desafio.dto';
import { RegistrarCumplimientoDto } from '../checkin/dto/registrar-cumplimiento.dto';
import { DeshacerCumplimientoDto } from '../checkin/dto/deshacer-cumplimiento.dto';
import { UnirseDesafioDto } from '../participaciones/dto/unirse-desafio.dto';
// Los DTO internos conservan el actor para los servicios; HTTP nunca lo acepta.
export class CrearDesafioHttpDto extends OmitType(CrearDesafioDto, ['creador'] as const) {}
export class RegistrarHttpDto extends OmitType(RegistrarCumplimientoDto, ['persona'] as const) {}
export class DeshacerHttpDto extends OmitType(DeshacerCumplimientoDto, ['persona'] as const) {}
export class UnirseHttpDto extends OmitType(UnirseDesafioDto, ['persona'] as const) {}
export class CancelarHttpDto {}
