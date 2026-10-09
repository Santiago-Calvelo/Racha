import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RegistrosService } from './registros.service';
import { RegistrosController } from './registros.controller';
import {
  RegistroCumplimiento,
  RegistroCumplimientoEsquema,
} from './entities/registro-cumplimiento.entity';
import { Desafio, DesafioEsquema } from '../desafios/entities/desafio.entity';
import { Persona, PersonaEsquema } from '../personas/entities/persona.entity';
import {
  Participacion,
  ParticipacionEsquema,
} from '../participaciones/entities/participacion.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RegistroCumplimiento.name, schema: RegistroCumplimientoEsquema },
      { name: Desafio.name, schema: DesafioEsquema },
      { name: Persona.name, schema: PersonaEsquema },
      { name: Participacion.name, schema: ParticipacionEsquema },
    ]),
  ],
  controllers: [RegistrosController],
  providers: [RegistrosService],
  exports: [RegistrosService],
})
export class RegistrosModule {}
