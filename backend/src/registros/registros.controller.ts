import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { RegistrosService } from './registros.service';
import { RegistrarCumplimientoDto } from './dto/registrar-cumplimiento.dto';
import { DeshacerCumplimientoDto } from './dto/deshacer-cumplimiento.dto';

@Controller('registros')
export class RegistrosController {
  constructor(private readonly registrosService: RegistrosService) {}

  @Post()
  registrar(@Body() dto: RegistrarCumplimientoDto) {
    return this.registrosService.registrar(dto);
  }

  @Delete('ultimo')
  deshacer(@Body() dto: DeshacerCumplimientoDto) {
    return this.registrosService.deshacer(dto);
  }

  @Get('desafio/:desafioId')
  listarPorDesafio(@Param('desafioId') desafioId: string) {
    return this.registrosService.listarPorDesafio(desafioId);
  }
}
