import { metricas, moverDia, puntosPara, rachaHasta } from './metricas';

describe('Puntos y rachas calendario', () => {
  it('adjudica cien puntos en los primeros siete días consecutivos', () => {
    const dias = new Set<string>();
    const puntos: number[] = [];
    for (let i = 0; i < 7; i++) {
      const dia = moverDia('2026-10-01', i);
      puntos.push(puntosPara(rachaHasta(dias, moverDia(dia, -1)) + 1));
      dias.add(dia);
    }
    expect(puntos).toEqual([10, 10, 15, 15, 15, 15, 20]);
    expect(puntos.reduce((a, b) => a + b)).toBe(100);
  });
  it('mantiene viva la racha de ayer y conserva la mejor cuando se interrumpe', () => {
    const registros = [1, 2, 3, 6, 7].map((d) => ({
      dia: `2026-10-0${d}`,
      puntos: 10,
    }));
    expect(metricas(registros, '2026-10-08')).toEqual({
      puntos: 50,
      rachaActual: 2,
      mejorRacha: 3,
      diasCumplidos: 5,
    });
    expect(metricas(registros, '2026-10-09').rachaActual).toBe(0);
    expect(metricas([], '2026-10-09')).toEqual({
      puntos: 0,
      rachaActual: 0,
      mejorRacha: 0,
      diasCumplidos: 0,
    });
  });
  it('el check-in retroactivo no usa días posteriores para su bonus', () => {
    const dias = new Set(['2026-10-01', '2026-10-02', '2026-10-04']);
    expect(puntosPara(1 + rachaHasta(dias, '2026-10-02'))).toBe(15);
    expect(
      metricas(
        [...dias, '2026-10-03'].map((dia) => ({
          dia,
          puntos: dia === '2026-10-03' ? 15 : 10,
        })),
        '2026-10-04',
      ).rachaActual,
    ).toBe(4);
  });
  it('mueve días calendario en cambios de mes, año y horario de verano', () => {
    expect(moverDia('2026-03-08', -1)).toBe('2026-03-07');
    expect(moverDia('2026-01-01', -1)).toBe('2025-12-31');
    expect(moverDia('2024-02-28', 1)).toBe('2024-02-29');
  });
});
