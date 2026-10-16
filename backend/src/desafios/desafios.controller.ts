import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DesafiosService } from './desafios.service';
import { CrearDesafioDto, FiltrarDesafiosDto } from './dto/crear-desafio.dto';
import {
  ActualizarDesafioDto,
  CancelarDesafioDto,
} from './dto/actualizar-desafio.dto';
import { MongoIdPipe } from '../comun/mongo-id.pipe';

@Controller('desafios')
export class DesafiosController {
  constructor(private readonly desafiosService: DesafiosService) {}

  @Post()
  crear(@Body() dto: CrearDesafioDto) {
    return this.desafiosService.crear(dto);
  }

  @Get()
  listar(@Body() filtros: FiltrarDesafiosDto) {
    return this.desafiosService.listar(filtros);
  }

  @Get('persona/:personaId')
  listarPorPersona(@Param('personaId', MongoIdPipe) personaId: string) {
    return this.desafiosService.listarPorPersona(personaId);
  }

  @Get(':id')
  obtener(@Param('id', MongoIdPipe) id: string) {
    return this.desafiosService.obtener(id);
  }

  @Patch(':id')
  actualizar(
    @Param('id', MongoIdPipe) id: string,
    @Body() dto: ActualizarDesafioDto,
  ) {
    return this.desafiosService.actualizar(id, dto);
  }

  @Post(':id/cancelar')
  cancelar(
    @Param('id', MongoIdPipe) id: string,
    @Body() cuerpo: CancelarDesafioDto,
  ) {
    return this.desafiosService.cancelar(id, cuerpo.creador);
  }
}
