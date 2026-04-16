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

type ErrorResponse = {
  error: string;
  message: string | string[];
  statusCode: number;
};

describe('Auth and categories flows (e2e)', () => {
  let harness: E2eHarness;

  beforeEach(async () => {
    harness = await createE2eHarness();
  });

  afterEach(async () => {
    await harness?.stop();
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

  it('rejects duplicate registration and invalid login attempts', async () => {
    const server = harness.app.getHttpServer() as Server;
    const registerPayload = {
      email: 'Duplicado@Example.com',
      name: 'Usuario Duplicado',
      password: 'strongPassword123',
    };

    await request(server)
      .post('/api/auth/register')
      .send(registerPayload)
      .expect(201);

    const duplicateRegisterResponse = await request(server)
      .post('/api/auth/register')
      .send(registerPayload)
      .expect(409);
    const duplicateRegisterBody =
      duplicateRegisterResponse.body as ErrorResponse;

    expect(duplicateRegisterBody.statusCode).toBe(409);
    expect(duplicateRegisterBody.error).toBe('Conflito');

    const duplicateCaseInsensitiveResponse = await request(server)
      .post('/api/auth/register')
      .send({
        ...registerPayload,
        email: ' duplicado@example.com ',
      })
      .expect(409);
    const duplicateCaseInsensitiveBody =
      duplicateCaseInsensitiveResponse.body as ErrorResponse;

    expect(duplicateCaseInsensitiveBody.statusCode).toBe(409);
    expect(duplicateCaseInsensitiveBody.error).toBe('Conflito');

    const invalidLoginResponse = await request(server)
      .post('/api/auth/login')
      .send({
        email: ' duplicado@example.com ',
        password: 'senha-errada',
      })
      .expect(401);
    const invalidLoginBody = invalidLoginResponse.body as ErrorResponse;

    expect(invalidLoginBody).toMatchObject({
      error: 'Nao autorizado',
      statusCode: 401,
    });
  });

  it('enforces the rate limit on the public register route', async () => {
    const server = harness.app.getHttpServer() as Server;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(server)
        .post('/api/auth/register')
        .send({
          email: `rate-limit-${attempt}@example.com`,
          name: 'Rate Limit',
          password: 'strongPassword123',
        })
        .expect(201);
    }

    const registerRateLimitResponse = await request(server)
      .post('/api/auth/register')
      .send({
        email: 'rate-limit-blocked@example.com',
        name: 'Rate Limit',
        password: 'strongPassword123',
      })
      .expect(429);
    const registerRateLimitBody =
      registerRateLimitResponse.body as ErrorResponse;

    expect(registerRateLimitBody.statusCode).toBe(429);
    expect(registerRateLimitBody.message).toBe(
      'Muitas requisicoes em pouco tempo. Aguarde alguns instantes e tente novamente.',
    );
  });

  it('enforces the rate limit on the public login route', async () => {
    const server = harness.app.getHttpServer() as Server;
    await request(server)
      .post('/api/auth/register')
      .send({
        email: 'login-limit@example.com',
        name: 'Rate Limit Login',
        password: 'strongPassword123',
      })
      .expect(201);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(server)
        .post('/api/auth/login')
        .send({
          email: 'login-limit@example.com',
          password: 'senha-errada',
        })
        .expect(401);
    }

    const loginRateLimitResponse = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'login-limit@example.com',
        password: 'senha-errada',
      })
      .expect(429);
    const loginRateLimitBody = loginRateLimitResponse.body as ErrorResponse;

    expect(loginRateLimitBody.statusCode).toBe(429);
    expect(loginRateLimitBody.message).toBe(
      'Muitas requisicoes em pouco tempo. Aguarde alguns instantes e tente novamente.',
    );
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

  it('rejects system-category mutations and foreign-category mutations', async () => {
    const server = harness.app.getHttpServer() as Server;
    const { token } = await harness.createAuthenticatedUser({
      email: 'cat-owner@example.com',
      name: 'Categoria Owner',
    });
    const otherUser = await harness.createAuthenticatedUser({
      email: 'cat-other@example.com',
      name: 'Categoria Other',
    });

    const systemCategory = await harness.findSystemCategory('Sal\u00e1rio');

    const customCategoryResponse = await request(server)
      .post('/api/categories')
      .set('Authorization', `Bearer ${otherUser.token}`)
      .send({
        name: 'Investimentos',
        type: 'INCOME',
      })
      .expect(201);
    const customCategory = customCategoryResponse.body as CategoryResponse;

    const systemUpdateResponse = await request(server)
      .patch(`/api/categories/${systemCategory.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Nao pode',
      })
      .expect(403);
    const systemUpdateBody = systemUpdateResponse.body as ErrorResponse;

    expect(systemUpdateBody).toMatchObject({
      error: 'Proibido',
      statusCode: 403,
    });

    const foreignDeleteResponse = await request(server)
      .delete(`/api/categories/${customCategory.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
    const foreignDeleteBody = foreignDeleteResponse.body as ErrorResponse;

    expect(foreignDeleteBody).toMatchObject({
      error: 'Nao encontrado',
      statusCode: 404,
    });
  });

  it('rejects invalid category identifiers and deletion of categories with linked transactions', async () => {
    const server = harness.app.getHttpServer() as Server;
    const { token } = await harness.createAuthenticatedUser({
      email: 'category-owner@example.com',
      name: 'Category Owner',
    });
    const expenseCategory = await harness.findSystemCategory(
      'Alimenta\u00e7\u00e3o',
    );

    const invalidPatchResponse = await request(server)
      .patch('/api/categories/invalid-uuid')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Nao importa',
      })
      .expect(400);
    const invalidPatchBody = invalidPatchResponse.body as ErrorResponse;

    expect(invalidPatchBody).toMatchObject({
      error: 'Requisicao invalida',
      statusCode: 400,
    });

    const customCategoryResponse = await request(server)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Cartao',
        type: 'EXPENSE',
      })
      .expect(201);
    const customCategory = customCategoryResponse.body as CategoryResponse;

    await request(server)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 250,
        categoryId: customCategory.id,
        description: 'Compra parcelada',
        type: 'EXPENSE',
      })
      .expect(201);

    const deleteLinkedCategoryResponse = await request(server)
      .delete(`/api/categories/${customCategory.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
    const deleteLinkedCategoryBody =
      deleteLinkedCategoryResponse.body as ErrorResponse;

    expect(deleteLinkedCategoryBody).toMatchObject({
      error: 'Conflito',
      statusCode: 409,
    });

    const invalidDeleteResponse = await request(server)
      .delete('/api/categories/invalid-uuid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    const invalidDeleteBody = invalidDeleteResponse.body as ErrorResponse;

    expect(invalidDeleteBody).toMatchObject({
      error: 'Requisicao invalida',
      statusCode: 400,
    });

    await request(server)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 75,
        categoryId: expenseCategory.id,
        description: 'Compra valida',
        type: 'EXPENSE',
      })
      .expect(201);
  });
});
