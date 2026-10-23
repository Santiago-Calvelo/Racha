import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
import { PersonasService } from '../personas/personas.service';

export const UsuarioId = createParamDecorator(
  (_: unknown, contexto: ExecutionContext): string => {
    const request = contexto.switchToHttp().getRequest<Request>();
    return String(request.headers['x-usuario-id']).toLowerCase();
  },
);

/** Identificación provisoria: no autentica la identidad del remitente. */
@Injectable()
export class UsuarioGuard implements CanActivate {
  constructor(private readonly personas: PersonasService) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const request = contexto.switchToHttp().getRequest<Request>();
    const id = request.headers['x-usuario-id'];
    if (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id)) {
      throw new BadRequestException(
        'El header x-usuario-id es obligatorio y debe ser un ObjectId válido',
      );
    }
    await this.personas.findOne(id.toLowerCase());
    return true;
  }
}
