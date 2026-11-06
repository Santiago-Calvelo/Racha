import { cliente } from './cliente';
import { esPersona } from './tipos';
import type { EditarPersona } from './tipos';
export const obtenerMe = (signal?: AbortSignal) => cliente.pedir('/me', esPersona, { signal });
export const elegirAlias = (alias: string) => cliente.pedir('/me/alias', esPersona, { metodo: 'PATCH', cuerpo: { alias } });
export const obtenerPersona = (id: string, signal?: AbortSignal) =>
  cliente.pedir(`/personas/${encodeURIComponent(id)}`, esPersona, { signal });
export const editarPersona = (_id: string, datos: EditarPersona, signal?: AbortSignal) =>
  cliente.pedir('/me', esPersona, { metodo: 'PATCH', cuerpo: datos, signal });
