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

describe('Auth and categories flows (e2e)', () => {
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

  it('registers, logs in, returns the current user, and rejects protected access without a token', async () => {
    const password = 'strongPassword123';
    const registerPayload = {
      email: 'maria.souza@example.com',
      name: 'Maria Souza',
      password,
    };

    const registerResponse = await request(harness.app.getHttpServer())
      .post('/api/auth/register')
      .send(registerPayload)
      .expect(201);

    expect(registerResponse.body).toMatchObject({
      email: registerPayload.email,
      name: registerPayload.name,
    });
    expect(registerResponse.body).not.toHaveProperty('password');

    const loginResponse = await request(harness.app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: registerPayload.email,
        password,
      })
      .expect(200);

    expect(loginResponse.body.access_token).toEqual(expect.any(String));

    await request(harness.app.getHttpServer()).get('/api/auth/me').expect(401);

    const profileResponse = await request(harness.app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
      .expect(200);

    expect(profileResponse.body).toMatchObject({
      email: registerPayload.email,
      id: registerResponse.body.id,
      name: registerPayload.name,
    });
  });

  it('lists seeded categories and manages the full custom category lifecycle', async () => {
    const { token } = await harness.createAuthenticatedUser();

    const initialCategoriesResponse = await request(harness.app.getHttpServer())
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(initialCategoriesResponse.body).toHaveLength(8);
    expect(
      initialCategoriesResponse.body
        .filter((category: { isSystem: boolean }) => category.isSystem)
        .map((category: { name: string }) => category.name)
        .sort(),
    ).toEqual([...EXPECTED_SYSTEM_CATEGORIES].sort());

    const createdCategoryResponse = await request(harness.app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Freelance',
        type: 'INCOME',
      })
      .expect(201);

    expect(createdCategoryResponse.body).toMatchObject({
      isSystem: false,
      name: 'Freelance',
      type: 'INCOME',
    });

    const updatedCategoryResponse = await request(harness.app.getHttpServer())
      .patch(`/api/categories/${createdCategoryResponse.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Projetos',
      })
      .expect(200);

    expect(updatedCategoryResponse.body).toMatchObject({
      id: createdCategoryResponse.body.id,
      name: 'Projetos',
      type: 'INCOME',
    });

    const listWithCustomCategoryResponse = await request(
      harness.app.getHttpServer(),
    )
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listWithCustomCategoryResponse.body).toHaveLength(9);

    await request(harness.app.getHttpServer())
      .delete(`/api/categories/${createdCategoryResponse.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const finalCategoriesResponse = await request(harness.app.getHttpServer())
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(finalCategoriesResponse.body).toHaveLength(8);
    expect(
      finalCategoriesResponse.body.some(
        (category: { name: string }) => category.name === 'Projetos',
      ),
    ).toBe(false);
  });
});
