// Se evalúa en cada pedido, después de cargar backend/.env.
export const origenWebPermitido = (origen: string | undefined,
  callback: (error: Error | null, permitido?: boolean) => void) => {
  const permitido = process.env.WEB_ORIGIN?.trim() || 'http://localhost:8081';
  callback(null, !origen || origen === permitido);
};
