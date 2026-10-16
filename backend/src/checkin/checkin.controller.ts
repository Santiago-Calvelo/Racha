import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { RegistrarCumplimientoDto } from './dto/registrar-cumplimiento.dto';
import { DeshacerCumplimientoDto } from './dto/deshacer-cumplimiento.dto';
import { MongoIdPipe } from '../comun/mongo-id.pipe';

@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post()
  registrar(@Body() dto: RegistrarCumplimientoDto) {
    return this.checkinService.registrar(dto);
  }

  @Delete('ultimo')
  deshacer(@Body() dto: DeshacerCumplimientoDto) {
    return this.checkinService.deshacer(dto);
  }

  @Get('desafio/:desafioId')
  listarPorDesafio(@Param('desafioId', MongoIdPipe) desafioId: string) {
    return this.checkinService.listarPorDesafio(desafioId);
  }

  @Get('desafio/:desafioId/persona/:personaId')
  listarPorPersona(
    @Param('desafioId', MongoIdPipe) desafioId: string,
    @Param('personaId', MongoIdPipe) personaId: string,
  ) {
    return this.checkinService.listarPorDesafio(desafioId, personaId);
  }
}
