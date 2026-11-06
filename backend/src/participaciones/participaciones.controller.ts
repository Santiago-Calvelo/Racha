import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ParticipacionesService } from './participaciones.service';
import { MongoIdPipe } from '../comun/mongo-id.pipe';
import { UsuarioId } from '../comun/usuario.guard';
import { UnirseHttpDto } from '../auth/contratos';

@Controller()
export class ParticipacionesController {
  constructor(
    private readonly participacionesService: ParticipacionesService,
  ) {}

  @Post('participaciones')
  unirse(@Body() dto: UnirseHttpDto, @UsuarioId() usuarioId: string) {
    return this.participacionesService.unirse({ ...dto, persona: usuarioId }, usuarioId);
  }

  @Post('desafios/:desafioId/abandonar')
  abandonar(
    @Param('desafioId', MongoIdPipe) desafioId: string,
    @UsuarioId() usuarioId: string,
  ) {
    return this.participacionesService.abandonar(desafioId, usuarioId, usuarioId);
  }

  @Get('desafios/:desafioId/participaciones')
  listarActivas(@Param('desafioId', MongoIdPipe) desafioId: string) {
    return this.participacionesService.listarActivas(desafioId);
  }
}
