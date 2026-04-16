import { INestApplication, Module } from '@nestjs/common';
import type { Server } from 'node:http';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { configureApp } from '../app.setup';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const authServiceMock = {
  login: jest.fn().mockResolvedValue({ access_token: 'token-de-teste' }),
  register: jest.fn().mockResolvedValue({
    id: 'user-1',
    email: 'maria@example.com',
    name: 'Maria',
  }),
};

@Module({
  controllers: [AuthController],
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: AuthService,
      useValue: authServiceMock,
    },
    {
      provide: JwtAuthGuard,
      useValue: {
        canActivate: () => true,
      },
    },
  ],
})
class AuthRateLimitTestModule {}

describe('AuthController hardening', () => {
  let app: INestApplication;
  let authService: {
    login: jest.Mock;
    register: jest.Mock;
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthRateLimitTestModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    authService = authServiceMock;
    authService.login.mockClear();
    authService.register.mockClear();
  });

  afterEach(async () => {
    await app.close();
  });

  it('limits repeated login attempts on the public login route', async () => {
    const server = app.getHttpServer() as Server;
    const payload = {
      email: 'maria@example.com',
      password: 'strongPassword123',
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(server).post('/api/auth/login').send(payload).expect(200);
    }

    await request(server).post('/api/auth/login').send(payload).expect(429);
    expect(authService.login).toHaveBeenCalledTimes(5);
  });

  it('limits repeated registration attempts on the public register route', async () => {
    const server = app.getHttpServer() as Server;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(server)
        .post('/api/auth/register')
        .send({
          email: `maria${attempt}@example.com`,
          name: 'Maria',
          password: 'strongPassword123',
        })
        .expect(201);
    }

    await request(server)
      .post('/api/auth/register')
      .send({
        email: 'maria-bloqueada@example.com',
        name: 'Maria',
        password: 'strongPassword123',
      })
      .expect(429);
    expect(authService.register).toHaveBeenCalledTimes(3);
  });
});
