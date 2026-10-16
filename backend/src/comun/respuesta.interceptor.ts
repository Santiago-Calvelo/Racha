import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Document, Types } from 'mongoose';
import { map } from 'rxjs';

export function serializarRespuesta(value: unknown): unknown {
  if (value instanceof Types.ObjectId) return value.toHexString();
  if (value instanceof Date || value === null || typeof value !== 'object')
    return value;
  if (value instanceof Document) return serializarRespuesta(value.toObject());
  if (Array.isArray(value)) return value.map(serializarRespuesta);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== '__v')
      .map(([key, entry]) => [
        key === '_id' ? 'id' : key,
        serializarRespuesta(entry),
      ]),
  );
}

export class RespuestaInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map(serializarRespuesta));
  }
}
