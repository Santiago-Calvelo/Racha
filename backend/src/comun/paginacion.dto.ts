import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class PaginacionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limite = 20;
}

export function paginar<T>(
  items: T[],
  total: number,
  { pagina = 1, limite = 20 }: PaginacionDto,
) {
  return { items, total, pagina, limite };
}
