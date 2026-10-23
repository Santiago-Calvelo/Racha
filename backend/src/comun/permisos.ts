import { ForbiddenException } from '@nestjs/common';

export function exigirMismaPersona(usuarioId: string, personaId: string): void {
  if (usuarioId.toLowerCase() !== String(personaId).toLowerCase()) {
    throw new ForbiddenException(
      'No se puede actuar en nombre de otra persona',
    );
  }
}
