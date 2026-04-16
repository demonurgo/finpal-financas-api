import type { Server } from 'node:http';
import request from 'supertest';
import { createE2eHarness, E2eHarness } from './e2e-harness';

const EXPECTED_SYSTEM_CATEGORIES = [
  'Alimenta\u00e7\u00e3o',
  'Educa\u00e7\u00e3o',
  'Lazer',
  'Moradia',
  'Outros',
  'Sal\u00e1rio',
  'Sa\u00fade',
  'Transporte',
];

describe('App bootstrap (e2e)', () => {
  let harness: E2eHarness;

  beforeAll(async () => {
    harness = await createE2eHarness();
  });

  afterAll(async () => {
    if (harness) {
      await harness.stop();
    }
  });

  beforeEach(async () => {
    await harness.resetDatabase();
  });

  it('boots with a disposable PostgreSQL database and seeds the system categories', async () => {
    const server = harness.app.getHttpServer() as Server;
    const response = await request(server).get('/api/auth/me').expect(401);

    expect(response.body).toMatchObject({
      error: 'Nao autorizado',
      statusCode: 401,
    });

    const systemCategories = await harness.prisma.category.findMany({
      where: {
        isSystem: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    expect(systemCategories).toHaveLength(8);
    expect(systemCategories.map((category) => category.name).sort()).toEqual(
      [...EXPECTED_SYSTEM_CATEGORIES].sort(),
    );
  });
});
