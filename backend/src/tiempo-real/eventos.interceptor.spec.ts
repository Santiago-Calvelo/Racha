import { ExecutionContext } from '@nestjs/common';
import { Subject } from 'rxjs';
import { EventosInterceptor } from './eventos.interceptor';
import { TiempoRealService } from './tiempo-real.service';

describe('Eventos después de persistir', () => {
  it('no emite antes de resolver el servicio ni ante un error de persistencia', () => {
    const emitir = jest.fn();
    const interceptor = new EventosInterceptor({ emitir } as unknown as TiempoRealService);
    const ctx = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => ({ method: 'POST', path: '/checkin', persona: { _id: 'ana', nombre: 'Ana' } }) }),
    } as unknown as ExecutionContext;
    const persistencia = new Subject<object>();
    interceptor.intercept(ctx, { handle: () => persistencia }).subscribe({ error: () => {} });
    expect(emitir).not.toHaveBeenCalled();
    persistencia.error(new Error('Transacción abortada'));
    expect(emitir).not.toHaveBeenCalled();
    const confirmada = new Subject<object>();
    interceptor.intercept(ctx, { handle: () => confirmada }).subscribe();
    confirmada.next({ desafio: 'reto' });
    expect(emitir).toHaveBeenCalledWith('checkin.registrado', 'reto', { id: 'ana', nombre: 'Ana' });
  });
});
