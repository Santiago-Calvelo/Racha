import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsuarioGuard } from './comun/usuario.guard';
import { resolve } from 'node:path';
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
import { EstadisticasModule } from './estadisticas/estadisticas.module';
import { AuthModule } from './auth/auth.module';
import { TiempoRealModule } from './tiempo-real/tiempo-real.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '../.env'),
      validate: validarEntorno,
    }),
    BaseDatosModule,
    PersonasModule,
    DesafiosModule,
    ParticipacionesModule,
    CheckinModule,
    EstadisticasModule,
    AuthModule,
    TiempoRealModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService, { provide: APP_GUARD, useClass: UsuarioGuard }],
})
export class AppModule {}
