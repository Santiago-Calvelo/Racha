import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ParticipacionesService } from './participaciones.service';
import { UnirseDesafioDto } from './dto/unirse-desafio.dto';

@Controller('desafios/:desafioId/participaciones')
export class ParticipacionesController {
  constructor(
    private readonly participacionesService: ParticipacionesService,
  ) {}

  @Post()
  unirse(
    @Param('desafioId') desafioId: string,
    @Body() dto: UnirseDesafioDto,
  ) {
    return this.participacionesService.unirse(desafioId, dto);
  }

  @Post(':personaId/abandonar')
  abandonar(
    @Param('desafioId') desafioId: string,
    @Param('personaId') personaId: string,
  ) {
    return this.participacionesService.abandonar(desafioId, personaId);
  }

  @Get()
  listarActivas(@Param('desafioId') desafioId: string) {
    return this.participacionesService.listarActivas(desafioId);
  }
}
