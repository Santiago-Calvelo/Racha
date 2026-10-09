import { ZONA_HORARIA_REFERENCIA } from './constantes';

/** Formato de día calendario: `YYYY-MM-DD`. */
const DIA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Verifica que el texto sea un día calendario real (no solo que coincida
 * con una expresión regular): rechaza meses o días inexistentes como
 * `2026-02-30` o `2026-13-01`.
 */
export function esDiaValido(dia: unknown): dia is string {
  if (typeof dia !== 'string' || !DIA_REGEX.test(dia)) {
    return false;
  }
  const [anio, mes, diaMes] = dia.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, diaMes));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === diaMes
  );
}

/**
 * Día calendario `YYYY-MM-DD` de un instante en una zona horaria IANA.
 * Usa `Intl` con `en-CA` (que emite ISO) y rechaza offsets tipo `+05:30`.
 */
export function diaEnZona(instante: Date, zonaHoraria: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
}

/** Día actual en la zona horaria de referencia (estado global). */
export function hoyReferencia(ahora = new Date()): string {
  return diaEnZona(ahora, ZONA_HORARIA_REFERENCIA);
}

/**
 * Cantidad de días entre dos días calendario, contando inicio y fin
 * (2026-01-01 a 2026-01-03 dura 3 días).
 */
export function duracionEnDias(fechaInicio: string, fechaFin: string): number {
  const inicio = Date.parse(`${fechaInicio}T00:00:00.000Z`);
  const fin = Date.parse(`${fechaFin}T00:00:00.000Z`);
  return Math.round((fin - inicio) / 86_400_000) + 1;
}

/**
 * Valida un nombre de zona horaria IANA con `Intl` (incluye enlaces) y
 * descarta offsets tipo `+05:30` o `-03:00`.
 */
export function esZonaHorariaValida(zona: unknown): zona is string {
  if (typeof zona !== 'string' || zona.trim() === '' || /^[+-]/.test(zona)) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

/** Genera un código de invitación de 6 caracteres (mayúsculas y dígitos). */
export function generarCodigoInvitacion(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = '';
  for (let i = 0; i < 6; i += 1) {
    codigo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return codigo;
}
