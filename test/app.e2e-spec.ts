import request from 'supertest';
import { createE2eHarness, E2eHarness } from './e2e-harness';

const EXPECTED_SYSTEM_CATEGORIES = [
  'Alimentação',
  'Educação',
  'Lazer',
  'Moradia',
  'Outros',
  'Salário',
  'Saúde',
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
    const response = await request(harness.app.getHttpServer())
      .get('/api/auth/me')
      .expect(401);

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
