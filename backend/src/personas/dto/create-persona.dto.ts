export class CreatePersonaDto {
  nombre: string;
  alias: string;
  email: string;
  /** Nombre IANA, p. ej. `America/Argentina/Buenos_Aires`. Opcional: si se omite se usa la zona por defecto. */
  zonaHoraria?: string;
}
