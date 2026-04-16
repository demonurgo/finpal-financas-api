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

type AuthTokenResponse = {
  access_token: string;
};

type CategoryResponse = {
  id: string;
  isSystem: boolean;
  name: string;
  type: 'INCOME' | 'EXPENSE';
};

type UserResponse = {
  email: string;
  id: string;
  name: string;
};

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
    const server = harness.app.getHttpServer() as Server;
    const password = 'strongPassword123';
    const registerPayload = {
      email: 'maria.souza@example.com',
      name: 'Maria Souza',
      password,
    };

    const registerResponse = await request(server)
      .post('/api/auth/register')
      .send(registerPayload)
      .expect(201);
    const registerBody = registerResponse.body as UserResponse;

    expect(registerBody).toMatchObject({
      email: registerPayload.email,
      name: registerPayload.name,
    });
    expect(registerBody).not.toHaveProperty('password');

    const loginResponse = await request(server)
      .post('/api/auth/login')
      .send({
        email: registerPayload.email,
        password,
      })
      .expect(200);
    const loginBody = loginResponse.body as AuthTokenResponse;

    expect(loginBody.access_token).toEqual(expect.any(String));

    await request(server).get('/api/auth/me').expect(401);

    const profileResponse = await request(server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginBody.access_token}`)
      .expect(200);
    const profileBody = profileResponse.body as UserResponse;

    expect(profileBody).toMatchObject({
      email: registerPayload.email,
      id: registerBody.id,
      name: registerPayload.name,
    });
  });

  it('lists seeded categories and manages the full custom category lifecycle', async () => {
    const server = harness.app.getHttpServer() as Server;
    const { token } = await harness.createAuthenticatedUser();

    const initialCategoriesResponse = await request(server)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const initialCategories =
      initialCategoriesResponse.body as CategoryResponse[];

    expect(initialCategories).toHaveLength(8);
    expect(
      initialCategories
        .filter((category) => category.isSystem)
        .map((category) => category.name)
        .sort(),
    ).toEqual([...EXPECTED_SYSTEM_CATEGORIES].sort());

    const createdCategoryResponse = await request(server)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Freelance',
        type: 'INCOME',
      })
      .expect(201);
    const createdCategory = createdCategoryResponse.body as CategoryResponse;

    expect(createdCategory).toMatchObject({
      isSystem: false,
      name: 'Freelance',
      type: 'INCOME',
    });

    const updatedCategoryResponse = await request(server)
      .patch(`/api/categories/${createdCategory.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Projetos',
      })
      .expect(200);
    const updatedCategory = updatedCategoryResponse.body as CategoryResponse;

    expect(updatedCategory).toMatchObject({
      id: createdCategory.id,
      name: 'Projetos',
      type: 'INCOME',
    });

    const listWithCustomCategoryResponse = await request(server)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const listWithCustomCategory =
      listWithCustomCategoryResponse.body as CategoryResponse[];

    expect(listWithCustomCategory).toHaveLength(9);

    await request(server)
      .delete(`/api/categories/${createdCategory.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const finalCategoriesResponse = await request(server)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const finalCategories = finalCategoriesResponse.body as CategoryResponse[];

    expect(finalCategories).toHaveLength(8);
    expect(
      finalCategories.some((category) => category.name === 'Projetos'),
    ).toBe(false);
  });
});
