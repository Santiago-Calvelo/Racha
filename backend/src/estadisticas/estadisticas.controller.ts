import { Controller, Get, Param, Query } from '@nestjs/common';
import { EstadisticasService } from './estadisticas.service';
import { MongoIdPipe } from '../comun/mongo-id.pipe';
import { PaginacionDto } from '../comun/paginacion.dto';

@Controller()
export class EstadisticasController {
  constructor(private readonly estadisticas: EstadisticasService) {}
  @Get('desafios/:desafioId/ranking')
  ranking(@Param('desafioId', MongoIdPipe) id: string) {
    return this.estadisticas.ranking(id);
  }
  @Get('desafios/:desafioId/personas/:personaId/progreso')
  progreso(
    @Param('desafioId', MongoIdPipe) id: string,
    @Param('personaId', MongoIdPipe) persona: string,
  ) {
    return this.estadisticas.progreso(id, persona);
  }
  @Get('personas/:personaId/inicio')
  inicio(@Param('personaId', MongoIdPipe) id: string) {
    return this.estadisticas.inicio(id);
  }
  @Get('personas/:personaId/resultados')
  resultados(
    @Param('personaId', MongoIdPipe) id: string,
    @Query() pagina: PaginacionDto,
  ) {
    return this.estadisticas.resultados(id, pagina);
  }
}
