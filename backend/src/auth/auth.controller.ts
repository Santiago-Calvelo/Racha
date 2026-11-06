import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import type { PeticionAutenticada } from '../comun/usuario.guard';
import { UsuarioId } from '../comun/usuario.guard';
import { PersonaAuthService } from './persona-auth.service';
import { PersonasService } from '../personas/personas.service';
import { UpdatePersonaDto } from '../personas/dto/update-persona.dto';
class AliasDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString()
  @Matches(/^[a-z0-9_]{3,20}$/)
  alias: string;
}
@Controller('me')
export class AuthController {
  constructor(private readonly personas: PersonaAuthService, private readonly perfiles: PersonasService) {}
  @Get()
  me(@Req() request: PeticionAutenticada) { return request.persona; }
  @Patch()
  editar(@UsuarioId() id: string, @Body() dto: UpdatePersonaDto) { return this.perfiles.update(id, dto, id); }
  @Patch('alias')
  alias(@UsuarioId() id: string, @Body() dto: AliasDto) { return this.personas.alias(id, dto.alias); }
}
