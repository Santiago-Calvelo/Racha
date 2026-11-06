import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';

export interface Identidad { emisor: string; sujeto: string; expira: number }

@Injectable()
export class TokenService {
  private readonly emisor: string;
  private readonly audiencia: string;
  private readonly claves: JWTVerifyGetKey;
  constructor(config: ConfigService) {
    this.emisor = `https://${config.getOrThrow<string>('AUTH0_DOMAIN')}/`;
    this.audiencia = config.getOrThrow<string>('AUTH0_AUDIENCE');
    this.claves = createRemoteJWKSet(new URL('.well-known/jwks.json', this.emisor));
  }
  async verificar(token: unknown): Promise<Identidad> {
    if (typeof token !== 'string' || !token) throw new UnauthorizedException('Iniciá sesión para continuar');
    try {
      const { payload } = await jwtVerify(token, this.claves, {
        issuer: this.emisor, audience: this.audiencia, algorithms: ['RS256'],
        requiredClaims: ['sub', 'exp', 'iat'],
      });
      if (!payload.sub || !payload.exp) throw new Error('Identidad incompleta');
      return { emisor: this.emisor, sujeto: payload.sub, expira: payload.exp };
    } catch (e) {
      if (e instanceof TypeError || e instanceof errors.JWKSTimeout || e instanceof errors.JWKSInvalid
        || (e instanceof errors.JOSEError && e.code === 'ERR_JOSE_GENERIC'))
        throw new ServiceUnavailableException('No se pudo consultar la identidad. Volvé a intentar');
      throw new UnauthorizedException('La sesión venció o no es válida');
    }
  }
}
