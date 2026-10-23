import { cliente, obtenerUsuarioId } from './cliente';
import { esParticipacion, esParticipacionConPersona, listaDe } from './tipos';

export const unirseADesafio = (
  codigoInvitacion: string,
  signal?: AbortSignal,
) =>
  cliente.pedir('/participaciones', esParticipacion, {
    metodo: 'POST',
    cuerpo: { persona: obtenerUsuarioId(), codigoInvitacion },
    signal,
  });
export const abandonarDesafio = (desafioId: string, signal?: AbortSignal) =>
  cliente.pedir(
    `/desafios/${encodeURIComponent(desafioId)}/participaciones/${obtenerUsuarioId()}/abandonar`,
    esParticipacion,
    { metodo: 'POST', signal },
  );
export const listarParticipantes = (desafioId: string, signal?: AbortSignal) =>
  cliente.pedir(
    `/desafios/${encodeURIComponent(desafioId)}/participaciones`,
    listaDe(esParticipacionConPersona),
    { signal },
  );
