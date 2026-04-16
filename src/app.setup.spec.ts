import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import type { Server } from 'node:http';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from './app.setup';

@Controller('health')
class HealthController {
  @Get()
  getStatus() {
    return { status: 'ok' };
  }
}

@Module({
  controllers: [HealthController],
})
class TestHealthModule {}

describe('configureApp hardening', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestHealthModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('removes x-powered-by and applies helmet headers', async () => {
    const server = app.getHttpServer() as Server;
    const response = await request(server).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});
