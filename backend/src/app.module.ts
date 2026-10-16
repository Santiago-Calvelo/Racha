import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BaseDatosModule } from './configuracion/base-datos.module';
import { validarEntorno } from './configuracion/validar-entorno';
import { PersonasModule } from './personas/personas.module';
import { DesafiosModule } from './desafios/desafios.module';
import { ParticipacionesModule } from './participaciones/participaciones.module';
import { CheckinModule } from './checkin/checkin.module';
import { SeedService } from './configuracion/seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEntorno }),
    BaseDatosModule,
    PersonasModule,
    DesafiosModule,
    ParticipacionesModule,
    CheckinModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule {}
