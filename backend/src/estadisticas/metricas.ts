export const moverDia = (dia: string, cantidad: number): string =>
  new Date(Date.parse(`${dia}T12:00:00Z`) + cantidad * 86_400_000)
    .toISOString()
    .slice(0, 10);

export function rachaHasta(dias: Set<string>, dia: string): number {
  let racha = 0;
  while (dias.has(dia)) {
    racha++;
    dia = moverDia(dia, -1);
  }
  return racha;
}

export function puntosPara(racha: number): number {
  return 10 + (racha >= 7 ? 10 : racha >= 3 ? 5 : 0);
}

export function metricas(
  registros: { dia: string; puntos: number }[],
  hoy: string,
) {
  const dias = new Set(registros.map((r) => r.dia));
  const ordenados = [...dias].sort();
  let mejorRacha = 0;
  let tramo = 0;
  let anterior = '';
  for (const dia of ordenados) {
    tramo = anterior && moverDia(anterior, 1) === dia ? tramo + 1 : 1;
    mejorRacha = Math.max(mejorRacha, tramo);
    anterior = dia;
  }
  return {
    puntos: registros.reduce((total, r) => total + r.puntos, 0),
    rachaActual: rachaHasta(dias, dias.has(hoy) ? hoy : moverDia(hoy, -1)),
    mejorRacha,
    diasCumplidos: dias.size,
  };
}
