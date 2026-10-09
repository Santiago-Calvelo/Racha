/** Zona horaria por defecto para las personas que no indican una. */
export const ZONA_HORARIA_POR_DEFECTO = 'America/Argentina/Buenos_Aires';

/**
 * Zona horaria de referencia para calcular el estado global de un desafío
 * (PROGRAMADO / ACTIVO / FINALIZADO) y el "hoy" de las validaciones de
 * fechas. Es la misma que la zona por defecto para evitar dos relojes.
 */
export const ZONA_HORARIA_REFERENCIA = 'America/Argentina/Buenos_Aires';

/** Máximo de desafíos vigentes (programados o activos) por persona, creados incluidos. */
export const MAXIMO_DESAFIOS_VIGENTES_POR_PERSONA = 5;

/** Duración permitida de un desafío en días, contando inicio y fin. */
export const DURACION_MINIMA_DIAS = 3;
export const DURACION_MAXIMA_DIAS = 90;
