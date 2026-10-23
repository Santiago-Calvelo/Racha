import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ParticipacionesService } from './participaciones.service';
import { UnirseDesafioDto } from './dto/unirse-desafio.dto';
import { MongoIdPipe } from '../comun/mongo-id.pipe';
import { UsuarioId } from '../comun/usuario.guard';

@Controller()
export class ParticipacionesController {
  constructor(
    private readonly participacionesService: ParticipacionesService,
  ) {}

  @Post('participaciones')
  unirse(@Body() dto: UnirseDesafioDto, @UsuarioId() usuarioId: string) {
    return this.participacionesService.unirse(dto, usuarioId);
  }

  @Post('desafios/:desafioId/participaciones/:personaId/abandonar')
  abandonar(
    @Param('desafioId', MongoIdPipe) desafioId: string,
    @Param('personaId', MongoIdPipe) personaId: string,
    @UsuarioId() usuarioId: string,
  ) {
    return this.participacionesService.abandonar(desafioId, personaId, usuarioId);
  }

  @Get('desafios/:desafioId/participaciones')
  listarActivas(@Param('desafioId', MongoIdPipe) desafioId: string) {
    return this.participacionesService.listarActivas(desafioId);
  }
}
