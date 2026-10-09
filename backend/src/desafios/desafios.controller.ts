import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DesafiosService } from './desafios.service';
import { CrearDesafioDto } from './dto/crear-desafio.dto';
import { ActualizarDesafioDto } from './dto/actualizar-desafio.dto';

@Controller('desafios')
export class DesafiosController {
  constructor(private readonly desafiosService: DesafiosService) {}

  @Post()
  crear(@Body() dto: CrearDesafioDto) {
    return this.desafiosService.crear(dto);
  }

  @Get()
  listar() {
    return this.desafiosService.listar();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.desafiosService.obtener(id);
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarDesafioDto) {
    return this.desafiosService.actualizar(id, dto);
  }

  @Post(':id/cancelar')
  cancelar(@Param('id') id: string, @Body() cuerpo: { creador: string }) {
    return this.desafiosService.cancelar(id, cuerpo.creador);
  }
}
