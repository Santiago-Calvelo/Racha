import { cliente } from './cliente';
import { esParticipacion, esParticipacionConPersona, listaDe } from './tipos';

export const unirseADesafio = (
  codigoInvitacion: string,
  signal?: AbortSignal,
) =>
  cliente.pedir('/participaciones', esParticipacion, {
    metodo: 'POST',
    cuerpo: { codigoInvitacion },
    signal,
  });
export const abandonarDesafio = (desafioId: string, signal?: AbortSignal) =>
  cliente.pedir(
    `/desafios/${encodeURIComponent(desafioId)}/abandonar`,
    esParticipacion,
    { metodo: 'POST', signal },
  );
export const listarParticipantes = (desafioId: string, signal?: AbortSignal) =>
  cliente.pedir(
    `/desafios/${encodeURIComponent(desafioId)}/participaciones`,
    listaDe(esParticipacionConPersona),
    { signal },
  );
