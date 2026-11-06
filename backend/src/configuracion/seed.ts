import 'reflect-metadata';
import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { NestFactory } from '@nestjs/core';
import { BaseDatosModule } from './base-datos.module';
import { validarEntorno } from './validar-entorno';
import { SeedService } from './seed.service';
import { IndicesAuthService } from '../auth/indices-auth.service';
import { Persona, PersonaEsquema } from '../personas/entities/persona.entity';
import { Desafio, DesafioEsquema } from '../desafios/entities/desafio.entity';
import {
  Participacion,
  ParticipacionEsquema,
} from '../participaciones/entities/participacion.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '../../.env'),
      validate: validarEntorno,
    }),
    BaseDatosModule,
    MongooseModule.forFeature([
      { name: Persona.name, schema: PersonaEsquema },
      { name: Desafio.name, schema: DesafioEsquema },
      { name: Participacion.name, schema: ParticipacionEsquema },
    ]),
  ],
  providers: [SeedService, IndicesAuthService],
})
class SeedModule {}

async function seed() {
  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    await app.get(IndicesAuthService).preparar();
    await app.get(SeedService).ejecutar();
    console.log(
      'Seed completado: 3 personas y 2 desafíos, sin sobrescribir datos existentes.',
    );
  } finally {
    await app.close();
  }
}

void seed().catch(() => {
  console.error(
    'No se pudo completar el seed. Revisá MONGODB_URI y la disponibilidad de MongoDB.',
  );
  process.exitCode = 1;
});
