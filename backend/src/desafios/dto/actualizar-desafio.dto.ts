import { CategoriaDesafio } from '../entities/desafio.entity';

export class ActualizarDesafioDto {
  nombre?: string;
  descripcion?: string;
  categoria?: CategoriaDesafio;
  fechaInicio?: string;
  fechaFin?: string;
  maximoParticipantes?: number;
}
