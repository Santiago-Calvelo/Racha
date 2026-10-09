export class RegistrarCumplimientoDto {
  /** Id de la persona que registra. */
  persona: string;
  /** Id del desafío. */
  desafio: string;
  /** Día a registrar: `hoy` (defecto) o `ayer`, según la zona de la persona. */
  dia?: string;
  /** Texto opcional, máximo 140 caracteres. */
  nota?: string;
  /** Número opcional, finito y no negativo. */
  valor?: number;
}
