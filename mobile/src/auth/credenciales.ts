import Auth0, { WebAuthError, WebAuthErrorCodes } from 'react-native-auth0';
import { Platform } from 'react-native';

let sdk: Auth0 | undefined;
let renovando: Promise<string> | undefined;
let renovacionForzada = false;
let ultimoToken: string | undefined;
let generacion = 0;
const esquema = 'racha';
export function clienteAuth0() {
  if (Platform.OS === 'web') throw new Error('El ingreso seguro está disponible en Android e iOS.');
  const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN?.trim();
  const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID?.trim();
  if (!domain || !clientId || !process.env.EXPO_PUBLIC_AUTH0_AUDIENCE?.trim())
    throw new Error('Completá la configuración de Auth0 en mobile/.env y reiniciá la app.');
  sdk ??= new Auth0({ domain, clientId });
  return sdk;
}
export async function ingresarGoogle() {
  const cliente = clienteAuth0();
  try {
    const credentials = await cliente.webAuth.authorize({
      scope: 'openid profile email offline_access',
      audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE,
      connection: 'google-oauth2',
      additionalParameters: { prompt: 'select_account' },
    }, { customScheme: esquema });
    await cliente.credentialsManager.saveCredentials(credentials);
    ultimoToken = credentials.accessToken;
  } catch (e) {
    if (e instanceof WebAuthError && e.type === WebAuthErrorCodes.USER_CANCELLED)
      throw new Error('Cancelaste el ingreso. Podés volver a intentarlo.');
    if (e instanceof WebAuthError && e.type === WebAuthErrorCodes.NETWORK_ERROR)
      throw new Error('No se pudo conectar con Google/Auth0. Revisá tu conexión.');
    throw new Error('No se pudo iniciar sesión con Google. Volvé a intentar; si continúa, revisá la configuración de Auth0.');
  }
}
export async function obtenerToken(forzar = false, rechazado?: string): Promise<string> {
  while (renovando) {
    const eraForzada = renovacionForzada;
    const token = await renovando;
    if (!forzar || eraForzada || (rechazado && token !== rechazado)) return token;
  }
  if (forzar && rechazado && ultimoToken && rechazado !== ultimoToken) return ultimoToken;
  const version = generacion;
  renovacionForzada = forzar;
  renovando = clienteAuth0().credentialsManager.getCredentials(undefined, 30, {}, forzar)
    .then(c => {
      if (version !== generacion) throw new Error('La sesión cambió. Volvé a ingresar.');
      ultimoToken = c.accessToken;
      return c.accessToken;
    }).finally(() => { renovando = undefined; });
  return renovando;
}
export const haySesion = () => clienteAuth0().credentialsManager.hasValidCredentials();
export async function borrarCredenciales() {
  generacion++;
  ultimoToken = undefined;
  // El SDK persiste también las renovaciones: esperar evita restaurar una sesión cerrada.
  await renovando?.catch(() => undefined);
  await clienteAuth0().credentialsManager.clearCredentials();
}
export async function cerrarSesion() {
  try { await clienteAuth0().webAuth.clearSession({}, { customScheme: esquema }); }
  finally { await borrarCredenciales(); }
}
