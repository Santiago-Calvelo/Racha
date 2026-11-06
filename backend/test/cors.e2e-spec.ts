import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { origenWebPermitido } from '../src/configuracion/cors';

@Controller()
class CorsPruebaController {
  @Get() obtener() { return { ok: true }; }
}
describe('CORS para el navegador', () => {
  let app: INestApplication;
  const previo = process.env.WEB_ORIGIN;
  beforeAll(async () => {
    process.env.WEB_ORIGIN = 'http://localhost:8081';
    const modulo = await Test.createTestingModule({ controllers: [CorsPruebaController] }).compile();
    app = modulo.createNestApplication();
    app.enableCors({ origin: origenWebPermitido, allowedHeaders: ['Authorization', 'Content-Type'],
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] });
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    if (previo === undefined) delete process.env.WEB_ORIGIN;
    else process.env.WEB_ORIGIN = previo;
  });
  it('permite preflight de Authorization al origen autorizado', async () => {
    const respuesta = await request(app.getHttpServer()).options('/')
      .set('Origin', 'http://localhost:8081').set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type').expect(204);
    expect(respuesta.headers['access-control-allow-origin']).toBe('http://localhost:8081');
    expect(respuesta.headers['access-control-allow-headers']).toContain('Authorization');
  });
  it('no concede acceso CORS a otro origen', async () => {
    const respuesta = await request(app.getHttpServer()).get('/').set('Origin', 'https://ajeno.example').expect(200);
    expect(respuesta.headers['access-control-allow-origin']).toBeUndefined();
  });
});
