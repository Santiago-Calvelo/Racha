import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { PaginacionDto } from '../comun/paginacion.dto';
import { CheckinService } from './checkin.service';
import { RegistrarCumplimientoDto } from './dto/registrar-cumplimiento.dto';
import { DeshacerCumplimientoDto } from './dto/deshacer-cumplimiento.dto';
import { MongoIdPipe } from '../comun/mongo-id.pipe';
import { UsuarioId } from '../comun/usuario.guard';

@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post()
  registrar(@Body() dto: RegistrarCumplimientoDto, @UsuarioId() usuarioId: string) {
    return this.checkinService.registrar(dto, usuarioId);
  }

  @Delete('ultimo')
  deshacer(@Body() dto: DeshacerCumplimientoDto, @UsuarioId() usuarioId: string) {
    return this.checkinService.deshacer(dto, usuarioId);
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
