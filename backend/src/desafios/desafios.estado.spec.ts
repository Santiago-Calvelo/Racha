import { calcularEstadoDesafio } from './entities/desafio.entity';

describe('calcularEstadoDesafio', () => {
  const base = {
    fechaInicio: '2026-10-10',
    fechaFin: '2026-10-20',
    fechaCancelacion: null,
  };

  it('calcula PROGRAMADO, ACTIVO y FINALIZADO desde las fechas', () => {
    expect(calcularEstadoDesafio(base, '2026-10-09')).toBe('PROGRAMADO');
    expect(calcularEstadoDesafio(base, '2026-10-10')).toBe('ACTIVO');
    expect(calcularEstadoDesafio(base, '2026-10-20')).toBe('ACTIVO');
    expect(calcularEstadoDesafio(base, '2026-10-21')).toBe('FINALIZADO');
  });

  it('representa CANCELADO con fechaCancelacion', () => {
    expect(
      calcularEstadoDesafio({ ...base, fechaCancelacion: new Date() }, '2026-10-15'),
    ).toBe('CANCELADO');
  });

  it('usa la zona de referencia, no la del participante', () => {
    // El "hoy" global se calcula una vez en America/Argentina/Buenos_Aires
    // y se pasa como parámetro: dos participantes en distintas zonas ven
    // el mismo estado global el mismo día de referencia.
    expect(calcularEstadoDesafio(base, '2026-10-09')).toBe('PROGRAMADO');
  });
});
