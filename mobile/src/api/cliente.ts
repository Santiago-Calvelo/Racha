import type { Validador } from './tipos';

const configuracion = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, ''),
  timeout: 10_000,
};
let usuarioId =
  process.env.EXPO_PUBLIC_USUARIO_INICIAL_ID?.trim().toLowerCase() ?? '';

export function obtenerUsuarioId(): string {
  if (!/^[a-f\d]{24}$/.test(usuarioId)) {
    throw new Error(
      'Configurá EXPO_PUBLIC_USUARIO_INICIAL_ID con una persona existente en el .env raíz y reiniciá Expo.',
    );
  }
  return usuarioId;
}

export function seleccionarUsuario(id: string): void {
  if (!/^[a-f\d]{24}$/i.test(id))
    throw new Error('El usuario debe tener un id de MongoDB válido.');
  usuarioId = id.toLowerCase();
}

export function restablecerUsuarioInicial(): void {
  usuarioId =
    process.env.EXPO_PUBLIC_USUARIO_INICIAL_ID?.trim().toLowerCase() ?? '';
}

export class ErrorApi extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ErrorApi';
  }
}

function mensajeError(datos: unknown, status: number): string {
  if (typeof datos === 'object' && datos !== null && 'message' in datos) {
    if (typeof datos.message === 'string') return datos.message;
    if (
      Array.isArray(datos.message) &&
      datos.message.every((m) => typeof m === 'string')
    ) {
      return datos.message
        .map((m) =>
          /\b(must|should)\b/.test(m)
            ? `Revisá ${m.startsWith('property ') ? 'los campos enviados' : `el campo ${m.split(' ')[0]}`}.`
            : m,
        )
        .join('\n');
    }
  }
  return `El servidor respondió con un error (${status}).`;
}

export const cliente = {
  async pedir<T>(
    ruta: string,
    validar: Validador<T>,
    opciones: {
      metodo?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      cuerpo?: object;
      signal?: AbortSignal;
    } = {},
  ): Promise<T> {
    if (
      !configuracion.baseUrl ||
      !/^https?:\/\/[^\s]+$/.test(configuracion.baseUrl)
    ) {
      throw new Error('Configurá EXPO_PUBLIC_API_URL en el .env raíz.');
    }
    const identidad = obtenerUsuarioId();
    const controller = new AbortController();
    const cancelar = () => controller.abort();
    opciones.signal?.addEventListener('abort', cancelar, { once: true });
    if (opciones.signal?.aborted) cancelar();
    let vencio = false;
    const timeout = setTimeout(() => {
      vencio = true;
      cancelar();
    }, configuracion.timeout);
    try {
      const respuesta = await fetch(`${configuracion.baseUrl}${ruta}`, {
        method: opciones.metodo ?? 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'x-usuario-id': identidad,
          ...(opciones.cuerpo ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(opciones.cuerpo ? { body: JSON.stringify(opciones.cuerpo) } : {}),
      });
      const texto = await respuesta.text();
      let datos: unknown;
      try {
        datos = JSON.parse(texto);
      } catch {
        if (!respuesta.ok)
          throw new ErrorApi(
            respuesta.status,
            mensajeError(null, respuesta.status),
          );
        throw new Error('El servidor devolvió una respuesta inválida.');
      }
      if (!respuesta.ok)
        throw new ErrorApi(
          respuesta.status,
          mensajeError(datos, respuesta.status),
        );
      if (!validar(datos))
        throw new Error('El servidor devolvió datos con un formato inválido.');
      return datos;
    } catch (error) {
      if (vencio)
        throw new Error(
          opciones.metodo && opciones.metodo !== 'GET'
            ? 'No se pudo confirmar la operación. Actualizá los datos antes de volver a intentar.'
            : 'El servidor no respondió en diez segundos. Volvé a intentar.',
        );
      if (opciones.signal?.aborted) throw error;
      if (error instanceof TypeError)
        throw new Error(
          'No se pudo conectar con el servidor. Revisá la conexión y volvé a intentar.',
        );
      throw error;
    } finally {
      clearTimeout(timeout);
      opciones.signal?.removeEventListener('abort', cancelar);
    }
  },
};
