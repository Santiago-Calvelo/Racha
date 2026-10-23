import { cliente } from './cliente';
import { esPersona, listaDe } from './tipos';
import type { CrearPersona, EditarPersona } from './tipos';

export const listarPersonas = (signal?: AbortSignal) =>
  cliente.pedir('/personas', listaDe(esPersona), { signal });
export const obtenerPersona = (id: string, signal?: AbortSignal) =>
  cliente.pedir(`/personas/${encodeURIComponent(id)}`, esPersona, { signal });
export const crearPersona = (datos: CrearPersona, signal?: AbortSignal) =>
  cliente.pedir('/personas', esPersona, {
    metodo: 'POST',
    cuerpo: datos,
    signal,
  });
export const editarPersona = (
  id: string,
  datos: EditarPersona,
  signal?: AbortSignal,
) =>
  cliente.pedir(`/personas/${encodeURIComponent(id)}`, esPersona, {
    metodo: 'PATCH',
    cuerpo: datos,
    signal,
  });
export const eliminarPersona = (id: string, signal?: AbortSignal) =>
  cliente.pedir(`/personas/${encodeURIComponent(id)}`, esPersona, {
    metodo: 'DELETE',
    signal,
  });
