import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

/**
 * Conexión centralizada a MongoDB Atlas. La URI se lee exclusivamente
 * desde `MONGODB_URI`; si falta, la validación del entorno hace fallar
 * el arranque con un mensaje seguro (sin exponer la URI).
 */
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
  ],
})
export class BaseDatosModule {}
