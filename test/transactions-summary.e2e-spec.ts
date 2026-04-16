import request from 'supertest';
import { createE2eHarness, E2eHarness } from './e2e-harness';

describe('Transactions and summary flows (e2e)', () => {
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

  it('covers transaction CRUD, filtered listing, and summary calculations with user isolation', async () => {
    const { token } = await harness.createAuthenticatedUser({
      email: 'ana.silva@example.com',
      name: 'Ana Silva',
    });
    const otherUser = await harness.createAuthenticatedUser({
      email: 'joao.silva@example.com',
      name: 'Joao Silva',
    });

    const incomeCategory = await harness.findSystemCategory('Salário');
    const expenseCategory = await harness.findSystemCategory('Alimentação');

    const incomeResponse = await request(harness.app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 5000,
        categoryId: incomeCategory.id,
        date: '2026-04-05T10:00:00.000Z',
        description: 'Salário de abril',
        type: 'INCOME',
      })
      .expect(201);

    const aprilExpenseResponse = await request(harness.app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 120.5,
        categoryId: expenseCategory.id,
        date: '2026-04-08T12:00:00.000Z',
        description: 'Mercado mensal',
        type: 'EXPENSE',
      })
      .expect(201);

    const marchExpenseResponse = await request(harness.app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 35,
        categoryId: expenseCategory.id,
        date: '2026-03-22T08:00:00.000Z',
        description: 'Lanche',
        type: 'EXPENSE',
      })
      .expect(201);

    await request(harness.app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${otherUser.token}`)
      .send({
        amount: 999,
        categoryId: expenseCategory.id,
        date: '2026-04-09T12:00:00.000Z',
        description: 'Compra de outra conta',
        type: 'EXPENSE',
      })
      .expect(201);

    const filteredListResponse = await request(harness.app.getHttpServer())
      .get(
        `/api/transactions?type=EXPENSE&categoryId=${expenseCategory.id}&month=4&year=2026&page=1&limit=5`,
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(filteredListResponse.body.meta).toMatchObject({
      limit: 5,
      page: 1,
      total: 1,
      totalPages: 1,
    });
    expect(filteredListResponse.body.data).toHaveLength(1);
    expect(filteredListResponse.body.data[0]).toMatchObject({
      description: 'Mercado mensal',
      id: aprilExpenseResponse.body.id,
      type: 'EXPENSE',
    });

    const updatedTransactionResponse = await request(harness.app.getHttpServer())
      .patch(`/api/transactions/${aprilExpenseResponse.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 200,
        date: '2026-04-10T12:00:00.000Z',
        description: 'Mercado atualizado',
      })
      .expect(200);

    expect(updatedTransactionResponse.body.description).toBe('Mercado atualizado');
    expect(Number(updatedTransactionResponse.body.amount)).toBe(200);

    const detailResponse = await request(harness.app.getHttpServer())
      .get(`/api/transactions/${incomeResponse.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(detailResponse.body).toMatchObject({
      description: 'Salário de abril',
      id: incomeResponse.body.id,
      type: 'INCOME',
    });
    expect(detailResponse.body.category).toMatchObject({
      id: incomeCategory.id,
      name: 'Salário',
    });

    const summaryResponse = await request(harness.app.getHttpServer())
      .get('/api/transactions/summary?month=4&year=2026')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(summaryResponse.body).toEqual({
      balance: 4800,
      totalExpense: 200,
      totalIncome: 5000,
    });

    await request(harness.app.getHttpServer())
      .delete(`/api/transactions/${marchExpenseResponse.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(harness.app.getHttpServer())
      .get(`/api/transactions/${marchExpenseResponse.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    const finalListResponse = await request(harness.app.getHttpServer())
      .get('/api/transactions?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(finalListResponse.body.meta).toMatchObject({
      total: 2,
      totalPages: 1,
    });
    expect(finalListResponse.body.data).toHaveLength(2);
  });
});
