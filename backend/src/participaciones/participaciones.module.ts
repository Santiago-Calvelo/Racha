import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ParticipacionesService } from './participaciones.service';
import { ParticipacionesController } from './participaciones.controller';
import {
  Participacion,
  ParticipacionEsquema,
} from './entities/participacion.entity';
import { Desafio, DesafioEsquema } from '../desafios/entities/desafio.entity';
import { Persona, PersonaEsquema } from '../personas/entities/persona.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Participacion.name, schema: ParticipacionEsquema },
      { name: Desafio.name, schema: DesafioEsquema },
      { name: Persona.name, schema: PersonaEsquema },
    ]),
  ],
  controllers: [ParticipacionesController],
  providers: [ParticipacionesService],
  exports: [ParticipacionesService, MongooseModule],
})
export class ParticipacionesModule {}
