import { cliente, obtenerUsuarioId } from './cliente';
import { esCheckin, paginaDe } from './tipos';
import type { RegistrarCheckin } from './tipos';

export const registrarCheckin = (
  datos: RegistrarCheckin,
  signal?: AbortSignal,
) =>
  cliente.pedir('/checkin', esCheckin, {
    metodo: 'POST',
    cuerpo: { ...datos, persona: obtenerUsuarioId() },
    signal,
  });
export const deshacerCheckin = (desafio: string, signal?: AbortSignal) =>
  cliente.pedir('/checkin/ultimo', esCheckin, {
    metodo: 'DELETE',
    cuerpo: { desafio, persona: obtenerUsuarioId() },
    signal,
  });
export const listarCheckins = (
  desafioId: string,
  pagina = 1,
  signal?: AbortSignal,
) =>
  cliente.pedir(
    `/checkin/desafio/${encodeURIComponent(desafioId)}?pagina=${pagina}`,
    paginaDe(esCheckin),
    { signal },
  );
export const listarCheckinsPorPersona = (
  desafioId: string,
  personaId: string,
  pagina = 1,
  signal?: AbortSignal,
) =>
  cliente.pedir(
    `/checkin/desafio/${encodeURIComponent(desafioId)}/persona/${encodeURIComponent(personaId)}?pagina=${pagina}`,
    paginaDe(esCheckin),
    { signal },
  );
