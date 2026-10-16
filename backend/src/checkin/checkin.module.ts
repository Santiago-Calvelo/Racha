import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CheckinService } from './checkin.service';
import { CheckinController } from './checkin.controller';
import { Checkin, CheckinEsquema } from './entities/checkin.entity';
import { Desafio, DesafioEsquema } from '../desafios/entities/desafio.entity';
import { Persona, PersonaEsquema } from '../personas/entities/persona.entity';
import {
  Participacion,
  ParticipacionEsquema,
} from '../participaciones/entities/participacion.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Checkin.name, schema: CheckinEsquema },
      { name: Desafio.name, schema: DesafioEsquema },
      { name: Persona.name, schema: PersonaEsquema },
      { name: Participacion.name, schema: ParticipacionEsquema },
    ]),
  ],
  controllers: [CheckinController],
  providers: [CheckinService],
  exports: [CheckinService],
})
export class CheckinModule {}
