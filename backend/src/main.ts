import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { RespuestaInterceptor } from './comun/respuesta.interceptor';
import { SeedService } from './configuracion/seed.service';
import { PuntosHistoricosService } from './estadisticas/puntos-historicos.service';
import { IndicesAuthService } from './auth/indices-auth.service';
import { origenWebPermitido } from './configuracion/cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: origenWebPermitido, allowedHeaders: ['Authorization', 'Content-Type'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new RespuestaInterceptor());
  await app.get(IndicesAuthService).preparar();
  await app.get(SeedService).ejecutar();
  await app.get(PuntosHistoricosService).completar();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
