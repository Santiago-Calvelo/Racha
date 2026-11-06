import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { tap } from 'rxjs';
import { TiempoRealService } from './tiempo-real.service';
import type { PeticionAutenticada } from '../comun/usuario.guard';

/** Los servicios resuelven después de guardar/confirmar sus transacciones. */
@Injectable()
export class EventosInterceptor implements NestInterceptor {
  constructor(private readonly tiempo: TiempoRealService) {}
  intercept(ctx: ExecutionContext, next: CallHandler) {
    if (ctx.getType() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest<PeticionAutenticada>();
    return next.handle().pipe(tap((resultado: unknown) => {
      if (!req.persona || !resultado || typeof resultado !== 'object') return;
      const datos = resultado as Record<string, unknown>;
      let evento: string | undefined;
      if (req.method === 'POST' && req.path === '/checkin') evento = 'checkin.registrado';
      if (req.method === 'DELETE' && req.path === '/checkin/ultimo') evento = 'checkin.deshecho';
      if (req.method === 'POST' && req.path === '/participaciones') evento = 'participante.unido';
      if (req.method === 'POST' && req.path.endsWith('/abandonar')) evento = 'participante.salio';
      if (req.method === 'POST' && req.path.endsWith('/cancelar')) evento = 'desafio.cancelado';
      const desafioId = datos.desafio ?? datos._id ?? datos.id;
      if (evento && desafioId) this.tiempo.emitir(evento, String(desafioId), { id: String(req.persona._id), nombre: req.persona.nombre });
    }));
  }
}
