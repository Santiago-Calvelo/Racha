import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BaseDatosModule } from './configuracion/base-datos.module';
import { validarEntorno } from './configuracion/validar-entorno';
import { PersonasModule } from './personas/personas.module';
import { DesafiosModule } from './desafios/desafios.module';
import { ParticipacionesModule } from './participaciones/participaciones.module';
import { RegistrosModule } from './registros/registros.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
    ConfigModule.forRoot({ isGlobal: true, validate: validarEntorno }),
    BaseDatosModule,
    PersonasModule,
    DesafiosModule,
    ParticipacionesModule,
    RegistrosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
