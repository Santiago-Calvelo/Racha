import { BadRequestException } from '@nestjs/common';
import { CategoriaDesafio } from './entities/desafio.entity';
import {
  DURACION_MAXIMA_DIAS,
  DURACION_MINIMA_DIAS,
} from '../comun/constantes';
import { duracionEnDias, esDiaValido } from '../comun/fechas';

export const NOMBRE_MINIMO = 3;
export const NOMBRE_MAXIMO = 60;
export const DESCRIPCION_MAXIMA = 280;
export const CUPO_MINIMO = 2;
export const CUPO_MAXIMO = 20;
export const CUPO_PREDETERMINADO = 10;
export const REINTENTOS_CODIGO = 5;

export function validarNombre(nombre: unknown): string {
  if (typeof nombre !== 'string' || nombre.trim() === '') {
    throw new BadRequestException('El campo "nombre" es obligatorio');
  }
  const valor = nombre.trim();
  if (valor.length < NOMBRE_MINIMO || valor.length > NOMBRE_MAXIMO) {
    throw new BadRequestException(
      'El nombre debe tener entre 3 y 60 caracteres',
    );
  }
  return valor;
}

export function validarDescripcion(descripcion: unknown): string | undefined {
  if (descripcion === undefined) {
    return undefined;
  }
  if (typeof descripcion !== 'string') {
    throw new BadRequestException('La descripción debe ser un texto');
  }
  if (descripcion.trim() !== '' && descripcion.trim().length > DESCRIPCION_MAXIMA) {
    throw new BadRequestException('La descripción admite 280 caracteres');
  }
  return descripcion.trim() === '' ? undefined : descripcion.trim();
}

export function validarCategoria(categoria: unknown): CategoriaDesafio {
  if (!Object.values(CategoriaDesafio).includes(categoria as CategoriaDesafio)) {
    throw new BadRequestException(
      'La categoría debe ser SALUD, ESTUDIO, FINANZAS, BIENESTAR u OTRO',
    );
  }
  return categoria as CategoriaDesafio;
}

export function validarFechasYCupo(
  entrada: {
    nombre?: unknown;
    descripcion?: unknown;
    categoria?: unknown;
    fechaInicio: unknown;
    fechaFin: unknown;
    maximoParticipantes?: unknown;
  },
  hoy: string,
): {
  nombre?: string;
  descripcion?: string;
  categoria?: CategoriaDesafio;
  fechaInicio: string;
  fechaFin: string;
  maximoParticipantes: number;
} {
  const resultado: {
    nombre?: string;
    descripcion?: string;
    categoria?: CategoriaDesafio;
    fechaInicio: string;
    fechaFin: string;
    maximoParticipantes: number;
  } = { fechaInicio: '', fechaFin: '', maximoParticipantes: CUPO_PREDETERMINADO };
  if (entrada.nombre !== undefined) {
    resultado.nombre = validarNombre(entrada.nombre);
  }
  if (entrada.descripcion !== undefined) {
    resultado.descripcion = validarDescripcion(entrada.descripcion);
  }
  if (entrada.categoria !== undefined) {
    resultado.categoria = validarCategoria(entrada.categoria);
  }

  if (!esDiaValido(entrada.fechaInicio)) {
    throw new BadRequestException(
      'La fecha de inicio debe ser un día real con formato YYYY-MM-DD',
    );
  }
  if (!esDiaValido(entrada.fechaFin)) {
    throw new BadRequestException(
      'La fecha de fin debe ser un día real con formato YYYY-MM-DD',
    );
  }
  if (entrada.fechaInicio < hoy) {
    throw new BadRequestException('El desafío no puede comenzar en el pasado');
  }
  if (entrada.fechaFin < entrada.fechaInicio) {
    throw new BadRequestException(
      'La fecha de fin no puede ser anterior a la de inicio',
    );
  }
  const duracion = duracionEnDias(entrada.fechaInicio, entrada.fechaFin);
  if (duracion < DURACION_MINIMA_DIAS || duracion > DURACION_MAXIMA_DIAS) {
    throw new BadRequestException(
      `El desafío debe durar entre ${DURACION_MINIMA_DIAS} y ${DURACION_MAXIMA_DIAS} días, contando inicio y fin`,
    );
  }
  resultado.fechaInicio = entrada.fechaInicio;
  resultado.fechaFin = entrada.fechaFin;

  const cupo =
    entrada.maximoParticipantes === undefined
      ? CUPO_PREDETERMINADO
      : entrada.maximoParticipantes;
  if (
    typeof cupo !== 'number' ||
    !Number.isInteger(cupo) ||
    cupo < CUPO_MINIMO ||
    cupo > CUPO_MAXIMO
  ) {
    throw new BadRequestException(
      'El máximo de participantes debe ser un entero entre 2 y 20',
    );
  }
  resultado.maximoParticipantes = cupo;
  return resultado;
}
