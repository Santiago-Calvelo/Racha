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
  const domain = config['AUTH0_DOMAIN'];
  const audience = config['AUTH0_AUDIENCE'];
  if (typeof domain !== 'string' || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain))
    throw new Error('Falta AUTH0_DOMAIN o no es un dominio válido (sin https:// ni /)');
  if (typeof audience !== 'string' || !audience.trim()) throw new Error('Falta AUTH0_AUDIENCE');
  return { MONGODB_URI: uri.trim(), AUTH0_DOMAIN: domain, AUTH0_AUDIENCE: audience.trim() };
}
