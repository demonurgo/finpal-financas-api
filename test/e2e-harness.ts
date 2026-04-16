import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaPg } from '@prisma/adapter-pg';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Category, PrismaClient } from '../src/generated/prisma/client';

type UserSeedInput = {
  email?: string;
  name?: string;
  password?: string;
};

type AuthTokenResponse = {
  access_token: string;
};

type AuthenticatedUser = {
  token: string;
  user: {
    email: string;
    id: string;
    name: string;
  };
};

export type E2eHarness = {
  app: INestApplication;
  createAuthenticatedUser: (
    input?: UserSeedInput,
  ) => Promise<AuthenticatedUser>;
  databaseUrl: string;
  findSystemCategory: (name: string) => Promise<Category>;
  prisma: PrismaClient;
  resetDatabase: () => Promise<void>;
  stop: () => Promise<void>;
};

const DOCKER_COMMAND = process.platform === 'win32' ? 'docker.exe' : 'docker';
const NPX_COMMAND = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const POSTGRES_IMAGE = 'postgres:16-alpine';
const POSTGRES_USER = 'finpal';
const POSTGRES_PASSWORD = 'finpal123';
const POSTGRES_DB = 'finpal_e2e';
const PROJECT_ROOT = join(__dirname, '..');

function quoteWindowsArg(value: string): string {
  if (value.length === 0) {
    return '""';
  }

  if (!/[ \t"&()[\]{}^=;!'+,`~]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function runCommand(
  command: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): string {
  const options = {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      ...env,
    },
    encoding: 'utf-8' as BufferEncoding,
    stdio: 'pipe' as const,
  };

  if (process.platform === 'win32' && command.endsWith('.cmd')) {
    const cmdLine = [command, ...args].map(quoteWindowsArg).join(' ');

    return execFileSync('cmd.exe', ['/d', '/s', '/c', cmdLine], options);
  }

  return execFileSync(command, args, options);
}

function setTestEnvironment(databaseUrl: string): () => void {
  const originalValues = {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    THROTTLE_LIMIT: process.env.THROTTLE_LIMIT,
    THROTTLE_TTL_MS: process.env.THROTTLE_TTL_MS,
  };

  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET = 'finpal-e2e-secret';
  process.env.JWT_EXPIRES_IN = '1d';
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0';
  process.env.THROTTLE_LIMIT = '1000';
  process.env.THROTTLE_TTL_MS = '60000';

  return () => {
    for (const [key, value] of Object.entries(originalValues)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

async function getAvailablePort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();

    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address === 'string') {
        reject(
          new Error('Could not reserve a host port for the e2e database.'),
        );
        return;
      }

      server.close(() => resolve(address.port));
    });
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealthyContainer(containerName: string): Promise<void> {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    try {
      const status = runCommand(DOCKER_COMMAND, [
        'inspect',
        '--format',
        '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}',
        containerName,
      ]).trim();

      if (status === 'healthy') {
        return;
      }

      if (status === 'unhealthy') {
        throw new Error(`Container ${containerName} became unhealthy.`);
      }
    } catch (error) {
      if (Date.now() >= deadline) {
        throw error;
      }
    }

    await sleep(1_000);
  }

  throw new Error(
    `Timed out while waiting for container ${containerName} to become healthy.`,
  );
}

function removeContainer(containerName?: string): void {
  if (!containerName) {
    return;
  }

  try {
    runCommand(DOCKER_COMMAND, ['rm', '--force', containerName]);
  } catch {
    // Best effort cleanup.
  }
}

function runPrismaCommand(databaseUrl: string, args: string[]): void {
  runCommand(NPX_COMMAND, ['prisma', ...args], {
    DATABASE_URL: databaseUrl,
  });
}

export async function createE2eHarness(): Promise<E2eHarness> {
  const hostPort = await getAvailablePort();
  const containerName = `finpal-e2e-${randomUUID().slice(0, 8)}`;
  const databaseUrl = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${hostPort}/${POSTGRES_DB}?schema=public`;
  const restoreEnvironment = setTestEnvironment(databaseUrl);

  let app: INestApplication | undefined;
  let pool: Pool | undefined;
  let prisma: PrismaClient | undefined;

  try {
    runCommand(DOCKER_COMMAND, [
      'run',
      '--detach',
      '--rm',
      '--name',
      containerName,
      '--health-cmd',
      `pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}`,
      '--health-interval',
      '1s',
      '--health-timeout',
      '5s',
      '--health-retries',
      '60',
      '--publish',
      `127.0.0.1:${hostPort}:5432`,
      '--env',
      `POSTGRES_USER=${POSTGRES_USER}`,
      '--env',
      `POSTGRES_PASSWORD=${POSTGRES_PASSWORD}`,
      '--env',
      `POSTGRES_DB=${POSTGRES_DB}`,
      POSTGRES_IMAGE,
    ]);

    await waitForHealthyContainer(containerName);
    runPrismaCommand(databaseUrl, ['db', 'push']);
    runPrismaCommand(databaseUrl, ['db', 'seed']);

    pool = new Pool({ connectionString: databaseUrl });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    await prisma.$connect();

    app = await NestFactory.create(AppModule, {
      logger: false,
    });
    configureApp(app);
    await app.init();

    return {
      app,
      databaseUrl,
      prisma,
      async createAuthenticatedUser(input = {}) {
        const password = input.password ?? 'strongPassword123';
        const registerPayload = {
          name: input.name ?? 'Maria Souza',
          email: input.email ?? `user-${randomUUID()}@finpal.test`,
          password,
        };
        const server = app.getHttpServer() as Server;

        const registerResponse = await request(server)
          .post('/api/auth/register')
          .send(registerPayload)
          .expect(201);

        const loginResponse = await request(server)
          .post('/api/auth/login')
          .send({
            email: registerPayload.email,
            password,
          })
          .expect(200);
        const loginBody = loginResponse.body as AuthTokenResponse;

        return {
          token: loginBody.access_token,
          user: registerResponse.body as AuthenticatedUser['user'],
        };
      },
      async findSystemCategory(name: string) {
        const category = await prisma.category.findFirst({
          where: {
            isSystem: true,
            name,
          },
        });

        if (!category) {
          throw new Error(
            `System category "${name}" was not found in the seeded database.`,
          );
        }

        return category;
      },
      async resetDatabase() {
        await prisma.transaction.deleteMany();
        await prisma.category.deleteMany({
          where: {
            isSystem: false,
          },
        });
        await prisma.user.deleteMany();
      },
      async stop() {
        await app?.close();
        await prisma?.$disconnect();
        await pool?.end();
        removeContainer(containerName);
        restoreEnvironment();
      },
    };
  } catch (error) {
    await app?.close();
    await prisma?.$disconnect();
    await pool?.end();
    removeContainer(containerName);
    restoreEnvironment();
    throw error;
  }
}
