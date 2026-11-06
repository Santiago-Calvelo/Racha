import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { TokenService } from './token.service';

describe('Validación real de access tokens', () => {
  let servicio: TokenService;
  let firmar: (opciones?: { issuer?: string; audience?: string; exp?: number }) => Promise<string>;
  let fetchMock: jest.SpyInstance;
  beforeAll(async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ keys: [{ ...jwk, kid: 'prueba', alg: 'RS256' }] }), { status: 200 }));
    servicio = new TokenService(new ConfigService({ AUTH0_DOMAIN: 'test.auth0.com', AUTH0_AUDIENCE: 'https://racha.api' }));
    firmar = (opciones = {}) => new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'prueba' }).setSubject('google-oauth2|123')
      .setIssuer(opciones.issuer ?? 'https://test.auth0.com/').setAudience(opciones.audience ?? 'https://racha.api')
      .setIssuedAt().setExpirationTime(opciones.exp ?? Math.floor(Date.now() / 1000) + 120).sign(privateKey);
  });
  afterAll(() => fetchMock.mockRestore());
  it('valida firma y devuelve la identidad externa', async () => {
    await expect(servicio.verificar(await firmar())).resolves.toMatchObject({ sujeto: 'google-oauth2|123', emisor: 'https://test.auth0.com/' });
  });
  it.each([{}, { issuer: 'https://otro.auth0.com/' }, { audience: 'otra-api' }, { exp: 1 }])('rechaza ausencia, emisor, audiencia y vencimiento: %j', async opciones => {
    const token = Object.keys(opciones).length ? await firmar(opciones) : undefined;
    await expect(servicio.verificar(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('rechaza firma adulterada y tokens de otro algoritmo', async () => {
    const token = await firmar();
    const partes = token.split('.');
    partes[2] = (partes[2][0] === 'A' ? 'B' : 'A') + partes[2].slice(1);
    await expect(servicio.verificar(partes.join('.'))).rejects.toBeInstanceOf(UnauthorizedException);
    const hs = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).sign(new TextEncoder().encode('una-clave-de-prueba-con-32-caracteres'));
    await expect(servicio.verificar(hs)).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('distingue indisponibilidad de JWKS de una credencial inválida', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Sin red'));
    const otro = new TokenService(new ConfigService({ AUTH0_DOMAIN: 'test.auth0.com', AUTH0_AUDIENCE: 'https://racha.api' }));
    await expect(otro.verificar(await firmar())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
