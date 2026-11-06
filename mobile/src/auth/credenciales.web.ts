import { Auth0Client, PopupCancelledError, PopupTimeoutError } from '@auth0/auth0-spa-js';

let sdk: Auth0Client | undefined;
let renovando: Promise<string> | undefined;
let forzada = false;
let ultimoToken: string | undefined;
let generacion = 0;

export function clienteAuth0() {
  const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN?.trim();
  const clientId = process.env.EXPO_PUBLIC_AUTH0_WEB_CLIENT_ID?.trim();
  const audience = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE?.trim();
  if (!domain || !clientId || !audience)
    throw new Error('Completá EXPO_PUBLIC_AUTH0_WEB_CLIENT_ID, DOMAIN y AUDIENCE de Auth0 en mobile/.env y reiniciá la web.');
  sdk ??= new Auth0Client({
    domain, clientId, cacheLocation: 'memory', useRefreshTokens: true,
    useRefreshTokensFallback: true,
    authorizationParams: { audience, scope: 'openid profile email offline_access', redirect_uri: window.location.origin },
  });
  return sdk;
}

export async function ingresarGoogle() {
  try {
    await clienteAuth0().loginWithPopup({
      authorizationParams: { connection: 'google-oauth2', prompt: 'select_account' },
    });
    ultimoToken = await obtenerToken();
  } catch (e) {
    if (e instanceof PopupCancelledError) throw new Error('Cancelaste el ingreso. Podés volver a intentarlo.');
    if (e instanceof PopupTimeoutError) {
      e.popup?.close();
      throw new Error('El ingreso tardó demasiado. Permití las ventanas emergentes y volvé a intentar.');
    }
    throw new Error('No se pudo ingresar. Revisá tu conexión, permití ventanas emergentes y verificá la configuración SPA de Auth0.');
  }
}

export async function obtenerToken(forzar = false, rechazado?: string): Promise<string> {
  while (renovando) {
    const eraForzada = forzada;
    const token = await renovando;
    if (!forzar || eraForzada || (rechazado && token !== rechazado)) return token;
  }
  if (forzar && rechazado && ultimoToken && rechazado !== ultimoToken) return ultimoToken;
  const version = generacion;
  forzada = forzar;
  renovando = clienteAuth0().getTokenSilently({ cacheMode: forzar ? 'off' : 'on' })
    .then(token => {
      if (!token) throw new Error('No se obtuvo un token. Volvé a ingresar.');
      if (version !== generacion) throw new Error('La sesión cambió. Volvé a ingresar.');
      ultimoToken = token;
      return token;
    }).finally(() => { renovando = undefined; });
  return renovando;
}

export async function haySesion() {
  await clienteAuth0().checkSession();
  return clienteAuth0().isAuthenticated();
}
export async function borrarCredenciales() {
  generacion++;
  ultimoToken = undefined;
  await renovando?.catch(() => undefined);
  await clienteAuth0().logout({ openUrl: false });
}
export async function cerrarSesion() {
  await borrarCredenciales();
  await clienteAuth0().logout({ logoutParams: { returnTo: window.location.origin } });
}
