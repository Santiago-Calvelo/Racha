import { PersonaEsquema } from '../personas/entities/persona.entity';
import { DesafioEsquema } from '../desafios/entities/desafio.entity';
import { ParticipacionEsquema } from '../participaciones/entities/participacion.entity';
import { RegistroCumplimientoEsquema } from '../registros/entities/registro-cumplimiento.entity';

/** Recolecta los índices declarados en un esquema (incluye `unique: true`). */
function indicesDe(esquema: { indexes(): [object, object][] }): object[] {
  return esquema.indexes().map(([campos, opciones]) => ({
    campos,
    opciones,
  }));
}

/** Nombre de colección explícito del esquema (evita el plural automático). */
function coleccionDe(esquema: { options?: { collection?: string } }): string {
  return esquema.options?.collection ?? '';
}

describe('índices únicos', () => {
  it('personas: alias y email únicos, colección `personas`', () => {
    expect(coleccionDe(PersonaEsquema)).toBe('personas');
    const rutas = PersonaEsquema.paths as Record<
      string,
      { options?: { unique?: boolean } }
    >;
    expect(rutas['alias']?.options?.unique).toBe(true);
    expect(rutas['email']?.options?.unique).toBe(true);
  });

  it('desafios: codigoInvitacion único, colección `desafios`', () => {
    expect(coleccionDe(DesafioEsquema)).toBe('desafios');
    const rutas = DesafioEsquema.paths as Record<
      string,
      { options?: { unique?: boolean } }
    >;
    expect(rutas['codigoInvitacion']?.options?.unique).toBe(true);
  });

  it('participaciones: índice único compuesto persona+desafio', () => {
    expect(coleccionDe(ParticipacionEsquema)).toBe('participaciones');
    expect(indicesDe(ParticipacionEsquema)).toContainEqual({
      campos: { persona: 1, desafio: 1 },
      opciones: { unique: true },
    });
  });

  it('registros: índice único compuesto persona+desafio+dia', () => {
    expect(coleccionDe(RegistroCumplimientoEsquema)).toBe(
      'registros_cumplimiento',
    );
    expect(indicesDe(RegistroCumplimientoEsquema)).toContainEqual({
      campos: { persona: 1, desafio: 1, dia: 1 },
      opciones: { unique: true },
    });
  });
});

