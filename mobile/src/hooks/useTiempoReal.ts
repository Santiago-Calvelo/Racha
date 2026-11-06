import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { io, type Socket } from 'socket.io-client';
import { baseUrlWs } from '../api/cliente';
import { obtenerToken } from '../auth/credenciales';

export const emojisAliento = ['👏', '💪', '🔥', '🎉', '❤️'] as const;
interface Evento {
  desafioId: string;
  actor: { id: string; nombre: string };
  destinatarioId?: string;
  emoji?: string;
}
type Ack = { ok: true } | { ok: false; error: { codigo: string; mensaje: string } };
const esEvento = (v: unknown): v is Evento => {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  return typeof e.desafioId === 'string' && !!e.actor && typeof e.actor === 'object'
    && 'id' in e.actor && typeof e.actor.id === 'string'
    && 'nombre' in e.actor && typeof e.actor.nombre === 'string';
};

export function useTiempoReal(desafioId: string, personaId: string, refrescar: () => void, vencerSesion: () => Promise<void>) {
  const socketRef = useRef<Socket | null>(null);
  const vencerRef = useRef(vencerSesion);
  vencerRef.current = vencerSesion;
  const [conectado, setConectado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  useFocusEffect(useCallback(() => {
    let activo = true;
    let recuperando = false;
    let timerAviso: ReturnType<typeof setTimeout> | undefined;
    let timerDatos: ReturnType<typeof setTimeout> | undefined;
    setConectado(false);
    setError(null);
    const notificar = (texto: string) => {
      setAviso(texto);
      clearTimeout(timerAviso);
      timerAviso = setTimeout(() => setAviso(null), 3500);
    };
    const renovar = async () => {
      if (recuperando || !activo) return;
      recuperando = true;
      try {
        await obtenerToken(true);
        if (activo) socket.connect();
      } catch {
        if (activo) await vencerRef.current();
      }
    };
    const socket = io(baseUrlWs() ?? '', {
      autoConnect: false,
      auth: callback => {
        void obtenerToken().then(token => { if (activo) callback({ token }); })
          .catch(async () => { if (activo) { setError('Tu sesión venció.'); await vencerRef.current(); } });
      },
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      recuperando = false;
      socket.timeout(8000).emit('desafio.suscribir', { desafioId }, (err: Error | null, ack: Ack) => {
        if (!activo) return;
        if (err || !ack) { setError('No pudimos suscribirnos. Volvé a intentar.'); return; }
        if (!ack.ok) { setError(ack.error.mensaje); return; }
        setConectado(true);
        setError(null);
        refrescar();
      });
    });
    socket.on('disconnect', () => {
      setConectado(false);
      if (activo) setError('Sin conexión en tiempo real. Reconectando…');
    });
    socket.on('connect_error', (e: Error & { data?: { codigo?: string } }) => {
      setError('No pudimos conectar el tiempo real. Podés reintentar.');
      if (e.data?.codigo === 'NO_AUTORIZADO') {
        if (recuperando) void vencerRef.current();
        else void renovar();
      }
    });
    socket.on('sesion.vencida', () => {
      socket.disconnect();
      void renovar();
    });
    const textos: Record<string, string> = {
      'checkin.registrado': 'hizo su check-in', 'checkin.deshecho': 'deshizo su check-in',
      'participante.unido': 'se unió al desafío', 'participante.salio': 'abandonó el desafío',
      'desafio.cancelado': 'canceló el desafío',
    };
    for (const evento of [...Object.keys(textos), 'ranking.actualizado']) {
      socket.on(evento, (datos: unknown) => {
        if (!activo || !esEvento(datos) || datos.desafioId !== desafioId) return;
        if (textos[evento] && datos.actor.id !== personaId) notificar(`${datos.actor.nombre} ${textos[evento]}`);
        clearTimeout(timerDatos);
        timerDatos = setTimeout(refrescar, 80);
        if (evento === 'participante.salio' && datos.actor.id === personaId) setConectado(false);
      });
    }
    socket.on('aliento.recibido', (datos: unknown) => {
      if (esEvento(datos) && datos.desafioId === desafioId && datos.destinatarioId === personaId
        && typeof datos.emoji === 'string' && (emojisAliento as readonly string[]).includes(datos.emoji))
        notificar(`${datos.actor.nombre} te envió ${datos.emoji}`);
    });
    const estado = AppState.addEventListener('change', siguiente => {
      if (siguiente === 'active') { socket.connect(); refrescar(); }
      else socket.disconnect();
    });
    socket.connect();
    return () => {
      activo = false;
      socket.emit('desafio.desuscribir', { desafioId });
      socket.disconnect();
      socket.removeAllListeners();
      socketRef.current = null;
      estado.remove();
      clearTimeout(timerAviso);
      clearTimeout(timerDatos);
    };
  }, [desafioId, personaId, refrescar, intento]));
  const alentar = (destinatarioId: string, emoji: string): Promise<void> => new Promise((resolve, reject) => {
    const socket = socketRef.current;
    if (!socket?.connected || !conectado) { reject(new Error('Esperá a que se conecte el desafío.')); return; }
    socket.timeout(8000).emit('aliento.enviar', { desafioId, destinatarioId, emoji }, (err: Error | null, ack: Ack) => {
      if (err || !ack) reject(new Error('No se pudo confirmar el aliento.'));
      else if (!ack.ok) reject(new Error(ack.error.mensaje));
      else resolve();
    });
  });
  return { conectado, error, aviso, alentar, reintentar: () => setIntento(v => v + 1) };
}
