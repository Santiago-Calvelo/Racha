import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { PaginacionDto } from '../comun/paginacion.dto';
import { CheckinService } from './checkin.service';
import { MongoIdPipe } from '../comun/mongo-id.pipe';
import { UsuarioId } from '../comun/usuario.guard';
import { RegistrarHttpDto, DeshacerHttpDto } from '../auth/contratos';

@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post()
  registrar(@Body() dto: RegistrarHttpDto, @UsuarioId() usuarioId: string) {
    return this.checkinService.registrar({ ...dto, persona: usuarioId }, usuarioId);
  }

  @Delete('ultimo')
  deshacer(@Body() dto: DeshacerHttpDto, @UsuarioId() usuarioId: string) {
    return this.checkinService.deshacer({ ...dto, persona: usuarioId }, usuarioId);
  }

  @Get('desafio/:desafioId')
  listarPorDesafio(@Param('desafioId', MongoIdPipe) desafioId: string, @Query() pagina: PaginacionDto) {
    return this.checkinService.listarPorDesafio(desafioId, undefined, pagina);
  }

  @Get('desafio/:desafioId/persona/:personaId')
  listarPorPersona(
    @Param('desafioId', MongoIdPipe) desafioId: string,
    @Param('personaId', MongoIdPipe) personaId: string,
    @Query() pagina: PaginacionDto,
  ) {
    return this.checkinService.listarPorDesafio(desafioId, personaId, pagina);
  }
}
