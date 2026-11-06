import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { Participacion, ParticipacionEsquema } from '../participaciones/entities/participacion.entity';
import { TiempoRealService } from './tiempo-real.service';
import { TiempoRealGateway } from './tiempo-real.gateway';
import { EventosInterceptor } from './eventos.interceptor';
@Module({
  imports: [MongooseModule.forFeature([{ name: Participacion.name, schema: ParticipacionEsquema }])],
  providers: [TiempoRealService, TiempoRealGateway, { provide: APP_INTERCEPTOR, useClass: EventosInterceptor }],
})
export class TiempoRealModule {}
