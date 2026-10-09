import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PersonasService } from './personas.service';
import { PersonasController } from './personas.controller';
import { Persona, PersonaEsquema } from './entities/persona.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Persona.name, schema: PersonaEsquema }]),
  ],
  controllers: [PersonasController],
  providers: [PersonasService],
  exports: [PersonasService, MongooseModule],
})
export class PersonasModule {}
