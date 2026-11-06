import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import type { Server } from 'socket.io';
import { Participacion, EstadoParticipacion } from '../participaciones/entities/participacion.entity';

export const EMOJIS = ['👏', '💪', '🔥', '🎉', '❤️'] as const;
export interface Actor { id: string; nombre: string }
@Injectable()
export class TiempoRealService {
  servidor?: Server;
  private readonly alientos = new Map<string, number>();
  constructor(@InjectModel(Participacion.name) private readonly participaciones: Model<Participacion>) {}
  sala(id: string) { return `desafio:${id}`; }
  async exigirParticipante(desafio: string, persona: string) {
    if (!isValidObjectId(desafio) || !isValidObjectId(persona))
      throw new ForbiddenException('El desafío o la persona no son válidos');
    const activa = await this.participaciones.exists({ desafio, persona, estado: EstadoParticipacion.ACTIVA });
    if (!activa) throw new ForbiddenException('Solo los participantes activos pueden entrar a esta sala');
  }
  emitir(evento: string, desafioId: string, actor: Actor) {
    const datos = { desafioId, actor, fecha: new Date().toISOString() };
    this.servidor?.to(this.sala(desafioId)).emit(evento, datos);
    if (evento !== 'desafio.cancelado')
      this.servidor?.to(this.sala(desafioId)).emit('ranking.actualizado', datos);
    if (evento === 'participante.salio') {
      for (const socket of this.servidor?.sockets.sockets.values() ?? [])
        if (socket.data.personaId === actor.id) void socket.leave(this.sala(desafioId));
    }
  }
  async alentar(desafioId: string, actor: Actor, destinatarioId: string, emoji: string) {
    await this.exigirParticipante(desafioId, actor.id);
    if (destinatarioId === actor.id) throw new ForbiddenException('No podés enviarte aliento a vos mismo');
    await this.exigirParticipante(desafioId, destinatarioId);
    if (!(EMOJIS as readonly string[]).includes(emoji)) throw new ForbiddenException('Elegí una reacción permitida');
    const ahora = Date.now();
    // La limpieza evita retener claves de participantes desconectados indefinidamente.
    for (const [clave, hasta] of this.alientos) if (hasta <= ahora) this.alientos.delete(clave);
    const clave = `${actor.id}:${desafioId}`;
    const restante = (this.alientos.get(clave) ?? 0) - ahora;
    if (restante > 0) return { ok: false as const, error: { codigo: 'LIMITE_ALIENTO', mensaje: 'Esperá diez segundos entre alientos', reintentarEn: Math.ceil(restante / 1000) } };
    this.alientos.set(clave, ahora + 10_000);
    this.servidor?.to(this.sala(desafioId)).emit('aliento.recibido', {
      desafioId, actor, destinatarioId, emoji, fecha: new Date(ahora).toISOString(),
    });
    return { ok: true as const };
  }
}
