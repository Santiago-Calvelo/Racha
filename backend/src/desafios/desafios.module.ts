import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DesafiosService } from './desafios.service';
import { DesafiosController } from './desafios.controller';
import { Desafio, DesafioEsquema } from './entities/desafio.entity';
import { Persona, PersonaEsquema } from '../personas/entities/persona.entity';
import {
  Participacion,
  ParticipacionEsquema,
} from '../participaciones/entities/participacion.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Desafio.name, schema: DesafioEsquema },
      { name: Persona.name, schema: PersonaEsquema },
      { name: Participacion.name, schema: ParticipacionEsquema },
    ]),
  ],
  controllers: [DesafiosController],
  providers: [DesafiosService],
  exports: [DesafiosService, MongooseModule],
})
export class DesafiosModule {}
