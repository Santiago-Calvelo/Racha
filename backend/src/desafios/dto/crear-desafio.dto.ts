import { CategoriaDesafio } from '../entities/desafio.entity';

export class CrearDesafioDto {
  nombre: string;
  descripcion?: string;
  categoria: CategoriaDesafio;
  /** Día calendario `YYYY-MM-DD`, no anterior a hoy (zona de referencia). */
  fechaInicio: string;
  /** Día calendario `YYYY-MM-DD`, duración total entre 3 y 90 días. */
  fechaFin: string;
  /** Entero entre 2 y 20. Opcional: 10 por defecto. */
  maximoParticipantes?: number;
  /** Id de la persona creadora (también queda como participante). */
  creador: string;
}
