import { cliente, obtenerUsuarioId } from './cliente';
import {
  esDesafio,
  esDesafioListado,
  esExplorable,
  listaDe,
  paginaDe,
} from './tipos';
import type { CrearDesafio, EditarDesafio } from './tipos';

export const listarDesafios = (
  filtros: {
    pagina?: number;
    limite?: number;
    categoria?: string;
    estado?: string;
  } = {},
  signal?: AbortSignal,
) => {
  const query = Object.entries(filtros)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return cliente.pedir(`/desafios?${query}`, paginaDe(esExplorable), {
    signal,
  });
};
export const listarDesafiosPorPersona = (id: string, signal?: AbortSignal) =>
  cliente.pedir(
    `/desafios/persona/${encodeURIComponent(id)}`,
    listaDe(esDesafioListado),
    { signal },
  );
export const obtenerDesafio = (id: string, signal?: AbortSignal) =>
  cliente.pedir(`/desafios/${encodeURIComponent(id)}`, esDesafioListado, {
    signal,
  });
export const crearDesafio = (datos: CrearDesafio, signal?: AbortSignal) =>
  cliente.pedir('/desafios', esDesafio, {
    metodo: 'POST',
    cuerpo: { ...datos, creador: obtenerUsuarioId() },
    signal,
  });
export const editarDesafio = (
  id: string,
  datos: EditarDesafio,
  signal?: AbortSignal,
) =>
  cliente.pedir(`/desafios/${encodeURIComponent(id)}`, esDesafio, {
    metodo: 'PATCH',
    cuerpo: datos,
    signal,
  });
export const cancelarDesafio = (id: string, signal?: AbortSignal) =>
  cliente.pedir(`/desafios/${encodeURIComponent(id)}/cancelar`, esDesafio, {
    metodo: 'POST',
    cuerpo: { creador: obtenerUsuarioId() },
    signal,
  });
