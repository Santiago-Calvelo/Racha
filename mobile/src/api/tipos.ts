export type CategoriaDesafio =
  'SALUD' | 'ESTUDIO' | 'FINANZAS' | 'BIENESTAR' | 'OTRO';
export type EstadoDesafio =
  'PROGRAMADO' | 'ACTIVO' | 'FINALIZADO' | 'CANCELADO';

export interface Persona {
  id: string;
  nombre: string;
  alias: string;
  email: string;
  zonaHoraria: string;
}
export interface CrearPersona {
  nombre: string;
  alias: string;
  email: string;
  zonaHoraria?: string;
}
export type EditarPersona = Partial<
  Pick<CrearPersona, 'nombre' | 'zonaHoraria'>
>;

export interface Desafio {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria: CategoriaDesafio;
  fechaInicio: string;
  fechaFin: string;
  maximoParticipantes: number;
  codigoInvitacion: string;
  creador: string;
  fechaCancelacion: string | null;
}
export interface DesafioListado extends Desafio {
  estado: EstadoDesafio;
}
export interface CrearDesafio {
  nombre: string;
  descripcion?: string;
  categoria: CategoriaDesafio;
  fechaInicio: string;
  fechaFin: string;
  maximoParticipantes?: number;
}
export type EditarDesafio = Partial<CrearDesafio>;

export interface Participacion {
  id: string;
  persona: string;
  desafio: string;
  estado: 'ACTIVA' | 'ABANDONADA';
  fechaIngreso: string;
  fechaAbandono: string | null;
}
export interface ParticipacionConPersona extends Omit<
  Participacion,
  'persona'
> {
  persona: Persona | null;
}
export interface Checkin {
  puntos: number;
  id: string;
  persona: string;
  desafio: string;
  dia: string;
  nota?: string;
  valor?: number;
}
export interface RegistrarCheckin {
  desafio: string;
  dia?: 'hoy' | 'ayer';
  nota?: string;
  valor?: number;
}

export type Validador<T> = (valor: unknown) => valor is T;
const objeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;
const textos = (v: Record<string, unknown>, campos: string[]) =>
  campos.every((c) => typeof v[c] === 'string');
const opcionalTexto = (v: unknown) => v === undefined || typeof v === 'string';
const textoONulo = (v: unknown) => v === null || typeof v === 'string';

export const esPersona: Validador<Persona> = (v): v is Persona =>
  objeto(v) && textos(v, ['id', 'nombre', 'alias', 'email', 'zonaHoraria']);
export const esDesafio: Validador<Desafio> = (v): v is Desafio =>
  objeto(v) &&
  textos(v, [
    'id',
    'nombre',
    'fechaInicio',
    'fechaFin',
    'codigoInvitacion',
    'creador',
  ]) &&
  ['SALUD', 'ESTUDIO', 'FINANZAS', 'BIENESTAR', 'OTRO'].includes(
    String(v.categoria),
  ) &&
  typeof v.maximoParticipantes === 'number' &&
  opcionalTexto(v.descripcion) &&
  textoONulo(v.fechaCancelacion);
export const esDesafioListado: Validador<DesafioListado> = (
  v,
): v is DesafioListado =>
  esDesafio(v) &&
  'estado' in v &&
  ['PROGRAMADO', 'ACTIVO', 'FINALIZADO', 'CANCELADO'].includes(
    String(v.estado),
  );

function baseParticipacion(v: unknown): v is Record<string, unknown> {
  return (
    objeto(v) &&
    textos(v, ['id', 'desafio', 'fechaIngreso']) &&
    (v.estado === 'ACTIVA' || v.estado === 'ABANDONADA') &&
    textoONulo(v.fechaAbandono)
  );
}
export const esParticipacion: Validador<Participacion> = (
  v,
): v is Participacion => baseParticipacion(v) && typeof v.persona === 'string';
export const esParticipacionConPersona: Validador<ParticipacionConPersona> = (
  v,
): v is ParticipacionConPersona =>
  baseParticipacion(v) && (v.persona === null || esPersona(v.persona));
export const esCheckin: Validador<Checkin> = (v): v is Checkin =>
  objeto(v) &&
  typeof v.puntos === 'number' &&
  textos(v, ['id', 'persona', 'desafio', 'dia']) &&
  opcionalTexto(v.nota) &&
  (v.valor === undefined ||
    (typeof v.valor === 'number' && Number.isFinite(v.valor)));
export const listaDe =
  <T>(validar: Validador<T>): Validador<T[]> =>
  (v): v is T[] =>
    Array.isArray(v) && v.every(validar);

export interface Pagina<T> {
  items: T[];
  pagina: number;
  limite: number;
  total: number;
}
export interface Metricas {
  puntos: number;
  rachaActual: number;
  mejorRacha: number;
  diasCumplidos: number;
}
export interface ProgresoPersona extends Metricas {
  personaId: string;
  desafioId: string;
  posicion: number | null;
  participacion: 'ACTIVA' | 'ABANDONADA' | null;
  hizoCheckinHoy: boolean;
  puedeHacerCheckinHoy: boolean;
  puedeDeshacerCheckin: boolean;
}
export interface FilaRanking extends Metricas {
  posicion: number;
  persona: Pick<Persona, 'id' | 'nombre' | 'alias'>;
}
export interface RankingDesafio {
  desafioId: string;
  estado: EstadoDesafio;
  participantes: FilaRanking[];
  ganador: FilaRanking | null;
}
export interface DesafioExplorable extends DesafioListado {
  participantesActivos: number;
  miParticipacion: 'ACTIVA' | 'ABANDONADA' | null;
}
export interface ResumenInicio {
  persona: Persona;
  desafios: {
    desafio: DesafioListado;
    participantesActivos: number;
    progreso: ProgresoPersona;
  }[];
}
export interface ResultadoFinalizado {
  desafio: DesafioListado;
  progreso: ProgresoPersona;
  ganador: FilaRanking | null;
}
export const paginaDe =
  <T>(validar: Validador<T>): Validador<Pagina<T>> =>
  (v): v is Pagina<T> =>
    objeto(v) &&
    listaDe(validar)(v.items) &&
    ['pagina', 'limite', 'total'].every(
      (c) => typeof v[c] === 'number' && Number.isInteger(v[c]),
    );
const sonMetricas = (v: unknown): v is Metricas =>
  objeto(v) &&
  ['puntos', 'rachaActual', 'mejorRacha', 'diasCumplidos'].every(
    (c) => typeof v[c] === 'number',
  );
export const esProgreso: Validador<ProgresoPersona> = (
  v,
): v is ProgresoPersona =>
  objeto(v) &&
  sonMetricas(v) &&
  textos(v, ['personaId', 'desafioId']) &&
  (v.posicion === null || typeof v.posicion === 'number') &&
  (v.participacion === null ||
    v.participacion === 'ACTIVA' ||
    v.participacion === 'ABANDONADA') &&
  ['hizoCheckinHoy', 'puedeHacerCheckinHoy', 'puedeDeshacerCheckin'].every(
    (c) => typeof v[c] === 'boolean',
  );
const esFila: Validador<FilaRanking> = (v): v is FilaRanking =>
  objeto(v) &&
  sonMetricas(v) &&
  typeof v.posicion === 'number' &&
  objeto(v.persona) &&
  textos(v.persona, ['id', 'nombre', 'alias']);
export const esRanking: Validador<RankingDesafio> = (v): v is RankingDesafio =>
  objeto(v) &&
  typeof v.desafioId === 'string' &&
  ['PROGRAMADO', 'ACTIVO', 'FINALIZADO', 'CANCELADO'].includes(
    String(v.estado),
  ) &&
  listaDe(esFila)(v.participantes) &&
  (v.ganador === null || esFila(v.ganador));
export const esExplorable: Validador<DesafioExplorable> = (
  v,
): v is DesafioExplorable =>
  esDesafioListado(v) &&
  'participantesActivos' in v &&
  typeof v.participantesActivos === 'number' &&
  'miParticipacion' in v &&
  (v.miParticipacion === null ||
    v.miParticipacion === 'ACTIVA' ||
    v.miParticipacion === 'ABANDONADA');
export const esResumen: Validador<ResumenInicio> = (v): v is ResumenInicio =>
  objeto(v) &&
  esPersona(v.persona) &&
  Array.isArray(v.desafios) &&
  v.desafios.every(
    (d) =>
      objeto(d) &&
      esDesafioListado(d.desafio) &&
      typeof d.participantesActivos === 'number' &&
      esProgreso(d.progreso),
  );
export const esResultado: Validador<ResultadoFinalizado> = (
  v,
): v is ResultadoFinalizado =>
  objeto(v) &&
  esDesafioListado(v.desafio) &&
  esProgreso(v.progreso) &&
  (v.ganador === null || esFila(v.ganador));
