import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Checkin, CheckinEsquema } from '../checkin/entities/checkin.entity';
import { Desafio, DesafioEsquema } from '../desafios/entities/desafio.entity';
import { Persona, PersonaEsquema } from '../personas/entities/persona.entity';
import {
  Participacion,
  ParticipacionEsquema,
} from '../participaciones/entities/participacion.entity';
import { EstadisticasService } from './estadisticas.service';
import { EstadisticasController } from './estadisticas.controller';
import { PuntosHistoricosService } from './puntos-historicos.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Checkin.name, schema: CheckinEsquema },
      { name: Desafio.name, schema: DesafioEsquema },
      { name: Persona.name, schema: PersonaEsquema },
      { name: Participacion.name, schema: ParticipacionEsquema },
    ]),
  ],
  controllers: [EstadisticasController],
  providers: [EstadisticasService, PuntosHistoricosService],
  exports: [PuntosHistoricosService],
})
export class EstadisticasModule {}
