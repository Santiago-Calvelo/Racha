import type { CrearDesafio, CrearPersona } from './api/tipos';

export const categorias = [
  'SALUD',
  'ESTUDIO',
  'FINANZAS',
  'BIENESTAR',
  'OTRO',
] as const;
export const zonas = [
  'America/Argentina/Buenos_Aires',
  'America/Santiago',
  'America/Bogota',
  'America/Mexico_City',
  'Europe/Madrid',
  'UTC',
] as const;
export const diaZona = (zona: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const moverDia = (dia: string, n: number) =>
  new Date(Date.parse(`${dia}T12:00:00Z`) + n * 86400000)
    .toISOString()
    .slice(0, 10);
export function validarPerfil(v: CrearPersona) {
  const errores = validarEdicionPerfil(v);
  if (!/^[A-Za-z0-9_]{3,20}$/.test(v.alias))
    errores.alias = 'Usá entre 3 y 20 letras, números o guion bajo.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))
    errores.email = 'Ingresá un email válido.';
  return errores;
}
export function validarEdicionPerfil(v: { nombre: string; zonaHoraria?: string }) {
  const errores: Record<string, string> = {};
  if (!v.nombre.trim()) errores.nombre = 'Ingresá tu nombre.';
  try {
    if (/^[+-]/.test(v.zonaHoraria ?? '')) throw new Error();
    new Intl.DateTimeFormat('en', { timeZone: v.zonaHoraria });
  } catch {
    errores.zonaHoraria = 'Ingresá una zona IANA válida.';
  }
  return errores;
}
export function validarDesafio(v: CrearDesafio, duracion: number) {
  const errores: Record<string, string> = {};
  if (v.nombre.trim().length < 3 || v.nombre.trim().length > 60)
    errores.nombre = 'El nombre debe tener entre 3 y 60 caracteres.';
  if ((v.descripcion?.length ?? 0) > 280)
    errores.descripcion = 'La descripción admite 280 caracteres.';
  if (!Number.isInteger(duracion) || duracion < 3 || duracion > 90)
    errores.duracion = 'Elegí entre 3 y 90 días.';
  if (v.fechaInicio < diaZona('America/Argentina/Buenos_Aires'))
    errores.fechaInicio =
      'La fecha no puede ser anterior a hoy en Buenos Aires.';
  if (
    v.maximoParticipantes !== undefined &&
    (!Number.isInteger(v.maximoParticipantes) ||
      v.maximoParticipantes < 2 ||
      v.maximoParticipantes > 20)
  )
    errores.cupo = 'El cupo debe estar entre 2 y 20 personas.';
  return errores;
}
