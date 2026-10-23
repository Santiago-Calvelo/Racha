import { cliente } from './cliente';
import {
  esProgreso,
  esRanking,
  esResumen,
  esResultado,
  paginaDe,
} from './tipos';

export const obtenerInicio = (persona: string, signal?: AbortSignal) =>
  cliente.pedir(`/personas/${encodeURIComponent(persona)}/inicio`, esResumen, {
    signal,
  });
export const obtenerProgreso = (
  desafio: string,
  persona: string,
  signal?: AbortSignal,
) =>
  cliente.pedir(
    `/desafios/${encodeURIComponent(desafio)}/personas/${encodeURIComponent(persona)}/progreso`,
    esProgreso,
    { signal },
  );
export const obtenerRanking = (desafio: string, signal?: AbortSignal) =>
  cliente.pedir(`/desafios/${encodeURIComponent(desafio)}/ranking`, esRanking, {
    signal,
  });
export const obtenerResultados = (
  persona: string,
  pagina = 1,
  signal?: AbortSignal,
) =>
  cliente.pedir(
    `/personas/${encodeURIComponent(persona)}/resultados?pagina=${pagina}`,
    paginaDe(esResultado),
    { signal },
  );
