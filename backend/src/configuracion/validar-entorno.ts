/**
 * Valida las variables de entorno obligatorias al iniciar la aplicación.
 * No registra ni devuelve secretos: solo informa qué variable falta.
 */
export function validarEntorno(
  config: Record<string, unknown>,
): Record<string, string> {
  const uri = config['MONGODB_URI'];
  if (typeof uri !== 'string' || uri.trim() === '') {
    throw new Error(
      'Falta la variable de entorno MONGODB_URI. ' +
        'Definila con la URI de MongoDB Atlas (ver .env.example).',
    );
  }
  return { MONGODB_URI: uri.trim() };
}
