import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DesafiosService } from './desafios.service';
import { FiltrarDesafiosDto } from './dto/crear-desafio.dto';
import {
  ActualizarDesafioDto,
} from './dto/actualizar-desafio.dto';
import { MongoIdPipe } from '../comun/mongo-id.pipe';
import { UsuarioId } from '../comun/usuario.guard';
import { CrearDesafioHttpDto, CancelarHttpDto } from '../auth/contratos';

@Controller('desafios')
export class DesafiosController {
  constructor(private readonly desafiosService: DesafiosService) {}

  @Post()
  crear(@Body() dto: CrearDesafioHttpDto, @UsuarioId() usuarioId: string) {
    return this.desafiosService.crear({ ...dto, creador: usuarioId }, usuarioId);
  }

  @Get()
  listar(@Query() filtros: FiltrarDesafiosDto, @UsuarioId() usuarioId: string) {
    return this.desafiosService.listar(filtros, usuarioId);
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
    @UsuarioId() usuarioId: string,
  ) {
    return this.desafiosService.actualizar(id, dto, usuarioId);
  }

  @Post(':id/cancelar')
  cancelar(
    @Param('id', MongoIdPipe) id: string,
    @Body() _cuerpo: CancelarHttpDto,
    @UsuarioId() usuarioId: string,
  ) {
    return this.desafiosService.cancelar(id, usuarioId, usuarioId);
  }
}
