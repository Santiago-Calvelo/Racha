import { IndicesAuthService } from './auth/indices-auth.service';
import { NestFactory } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { SeedService } from './configuracion/seed.service';
import { PuntosHistoricosService } from './estadisticas/puntos-historicos.service';

describe('Arranque HTTP', () => {
  it('espera la precarga antes de escuchar peticiones', async () => {
    let iniciarSeed!: () => void;
    let completarSeed!: () => void;
    let escuchar!: () => void;
    const seedIniciado = new Promise<void>((resolve) => {
      iniciarSeed = resolve;
    });
    const seedPendiente = new Promise<void>((resolve) => {
      completarSeed = resolve;
    });
    const servidorEscuchando = new Promise<void>((resolve) => {
      escuchar = resolve;
    });
    const seed = {
      ejecutar: jest.fn(() => {
        iniciarSeed();
        return seedPendiente;
      }),
    };
    const modulo = await Test.createTestingModule({
      providers: [{ provide: IndicesAuthService, useValue: { preparar: jest.fn().mockResolvedValue(undefined) } }, { provide: SeedService, useValue: seed },
        { provide: PuntosHistoricosService, useValue: { completar: jest.fn().mockResolvedValue(undefined) } }],
    }).compile();
    const app = modulo.createNestApplication();
    const crear = jest.spyOn(NestFactory, 'create').mockResolvedValue(app);
    const listen = jest.spyOn(app, 'listen').mockImplementation(async () => {
      escuchar();
      return app.getHttpServer();
    });
    const uriAnterior = process.env.MONGODB_URI;
    const dominioAnterior = process.env.AUTH0_DOMAIN;
    const audienciaAnterior = process.env.AUTH0_AUDIENCE;
    process.env.AUTH0_DOMAIN = 'test.auth0.com';
    process.env.AUTH0_AUDIENCE = 'https://racha.api';
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/racha-arranque-test';
    try {
      require('./main');
      await seedIniciado;
      expect(listen).not.toHaveBeenCalled();
      completarSeed();
      await servidorEscuchando;
      expect(seed.ejecutar).toHaveBeenCalledTimes(1);
      expect(listen).toHaveBeenCalledTimes(1);
    } finally {
      completarSeed();
      crear.mockRestore();
      listen.mockRestore();
      await app.close();
      if (uriAnterior === undefined) delete process.env.MONGODB_URI;
      else process.env.MONGODB_URI = uriAnterior;
      if (dominioAnterior === undefined) delete process.env.AUTH0_DOMAIN;
      else process.env.AUTH0_DOMAIN = dominioAnterior;
      if (audienciaAnterior === undefined) delete process.env.AUTH0_AUDIENCE;
      else process.env.AUTH0_AUDIENCE = audienciaAnterior;
    }
  });
});
