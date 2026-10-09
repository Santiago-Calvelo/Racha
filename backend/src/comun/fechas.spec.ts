import { esDiaValido, duracionEnDias, esZonaHorariaValida } from './fechas';

describe('fechas', () => {
  describe('esDiaValido', () => {
    it('acepta días reales con formato YYYY-MM-DD', () => {
      expect(esDiaValido('2026-10-09')).toBe(true);
      expect(esDiaValido('2024-02-29')).toBe(true);
    });

    it('rechaza días inexistentes aunque cumplan el formato', () => {
      expect(esDiaValido('2026-02-30')).toBe(false);
      expect(esDiaValido('2026-13-01')).toBe(false);
      expect(esDiaValido('2026-00-10')).toBe(false);
      expect(esDiaValido('09/10/2026')).toBe(false);
    });
  });

  describe('duracionEnDias', () => {
    it('cuenta inicio y fin (3 días de corrido)', () => {
      expect(duracionEnDias('2026-01-01', '2026-01-03')).toBe(3);
      expect(duracionEnDias('2026-01-01', '2026-01-01')).toBe(1);
    });
  });

  describe('esZonaHorariaValida', () => {
    it('acepta nombres IANA y rechaza offsets', () => {
      expect(esZonaHorariaValida('America/Argentina/Buenos_Aires')).toBe(true);
      expect(esZonaHorariaValida('+05:30')).toBe(false);
      expect(esZonaHorariaValida('Marte/Olympus_Mons')).toBe(false);
    });
  });
});
