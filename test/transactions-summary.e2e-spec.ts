import type { Server } from 'node:http';
import request from 'supertest';
import { createE2eHarness, E2eHarness } from './e2e-harness';

type PaginationMeta = {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

type TransactionResponse = {
  amount: number | string;
  category?: {
    id: string;
    name: string;
  };
  description: string;
  id: string;
  type: 'INCOME' | 'EXPENSE';
};

type PaginatedTransactionsResponse = {
  data: TransactionResponse[];
  meta: PaginationMeta;
};

type SummaryResponse = {
  balance: number;
  totalExpense: number;
  totalIncome: number;
};

type ErrorResponse = {
  error: string;
  message: string | string[];
  statusCode: number;
};

describe('Transactions and summary flows (e2e)', () => {
  let harness: E2eHarness;

  beforeEach(async () => {
    harness = await createE2eHarness();
  });

  afterEach(async () => {
    await harness?.stop();
  });

  it('covers transaction CRUD, filtered listing, and summary calculations with user isolation', async () => {
    const server = harness.app.getHttpServer() as Server;
    const { token } = await harness.createAuthenticatedUser({
      email: 'ana.silva@example.com',
      name: 'Ana Silva',
    });
    const otherUser = await harness.createAuthenticatedUser({
      email: 'joao.silva@example.com',
      name: 'Joao Silva',
    });

    const incomeCategory = await harness.findSystemCategory('Sal\u00e1rio');
    const expenseCategory = await harness.findSystemCategory(
      'Alimenta\u00e7\u00e3o',
    );

    const incomeResponse = await request(server)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 5000,
        categoryId: incomeCategory.id,
        date: '2026-04-05T10:00:00.000Z',
        description: 'Salario de abril',
        type: 'INCOME',
      })
      .expect(201);
    const incomeTransaction = incomeResponse.body as TransactionResponse;

    const aprilExpenseResponse = await request(server)
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
    const aprilExpense = aprilExpenseResponse.body as TransactionResponse;

    const marchExpenseResponse = await request(server)
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
    const marchExpense = marchExpenseResponse.body as TransactionResponse;

    await request(server)
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

    const filteredListResponse = await request(server)
      .get(
        `/api/transactions?type=EXPENSE&categoryId=${expenseCategory.id}&month=4&year=2026&page=1&limit=5`,
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const filteredList =
      filteredListResponse.body as PaginatedTransactionsResponse;

    expect(filteredList.meta).toMatchObject({
      limit: 5,
      page: 1,
      total: 1,
      totalPages: 1,
    });
    expect(filteredList.data).toHaveLength(1);
    expect(filteredList.data[0]).toMatchObject({
      description: 'Mercado mensal',
      id: aprilExpense.id,
      type: 'EXPENSE',
    });

    const updatedTransactionResponse = await request(server)
      .patch(`/api/transactions/${aprilExpense.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 200,
        date: '2026-04-10T12:00:00.000Z',
        description: 'Mercado atualizado',
      })
      .expect(200);
    const updatedTransaction =
      updatedTransactionResponse.body as TransactionResponse;

    expect(updatedTransaction.description).toBe('Mercado atualizado');
    expect(Number(updatedTransaction.amount)).toBe(200);

    const detailResponse = await request(server)
      .get(`/api/transactions/${incomeTransaction.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const detail = detailResponse.body as TransactionResponse;

    expect(detail).toMatchObject({
      description: 'Salario de abril',
      id: incomeTransaction.id,
      type: 'INCOME',
    });
    expect(detail.category).toMatchObject({
      id: incomeCategory.id,
      name: 'Sal\u00e1rio',
    });

    const summaryResponse = await request(server)
      .get('/api/transactions/summary?month=4&year=2026')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const summary = summaryResponse.body as SummaryResponse;

    expect(summary).toEqual({
      balance: 4800,
      totalExpense: 200,
      totalIncome: 5000,
    });

    await request(server)
      .delete(`/api/transactions/${marchExpense.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(server)
      .get(`/api/transactions/${marchExpense.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    const finalListResponse = await request(server)
      .get('/api/transactions?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const finalList = finalListResponse.body as PaginatedTransactionsResponse;

    expect(finalList.meta).toMatchObject({
      total: 2,
      totalPages: 1,
    });
    expect(finalList.data).toHaveLength(2);
  });

  it('rejects invalid categories, mismatched types, and cross-user transaction access', async () => {
    const server = harness.app.getHttpServer() as Server;
    const { token } = await harness.createAuthenticatedUser({
      email: 'negativo@example.com',
      name: 'Negativo',
    });
    const otherUser = await harness.createAuthenticatedUser({
      email: 'negativo-other@example.com',
      name: 'Negativo Other',
    });

    const incomeCategory = await harness.findSystemCategory('Sal\u00e1rio');
    const expenseCategory = await harness.findSystemCategory(
      'Alimenta\u00e7\u00e3o',
    );

    const invalidCategoryResponse = await request(server)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 50,
        categoryId: '00000000-0000-0000-0000-000000000000',
        description: 'Categoria invalida',
        type: 'EXPENSE',
      })
      .expect(400);
    const invalidCategoryBody = invalidCategoryResponse.body as ErrorResponse;

    expect(invalidCategoryBody).toMatchObject({
      error: 'Requisicao invalida',
      statusCode: 400,
    });

    const mismatchedTypeResponse = await request(server)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 100,
        categoryId: expenseCategory.id,
        description: 'Tipo incorreto',
        type: 'INCOME',
      })
      .expect(400);
    const mismatchedTypeBody = mismatchedTypeResponse.body as ErrorResponse;

    expect(mismatchedTypeBody).toMatchObject({
      error: 'Requisicao invalida',
      statusCode: 400,
    });

    const otherTransactionResponse = await request(server)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${otherUser.token}`)
      .send({
        amount: 3500,
        categoryId: incomeCategory.id,
        description: 'Transacao alheia',
        type: 'INCOME',
      })
      .expect(201);
    const otherTransaction =
      otherTransactionResponse.body as TransactionResponse;

    const foreignReadResponse = await request(server)
      .get(`/api/transactions/${otherTransaction.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
    const foreignReadBody = foreignReadResponse.body as ErrorResponse;

    expect(foreignReadBody).toMatchObject({
      error: 'Nao encontrado',
      statusCode: 404,
    });

    const ownExpenseResponse = await request(server)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 80,
        categoryId: expenseCategory.id,
        description: 'Despesa propria',
        type: 'EXPENSE',
      })
      .expect(201);
    const ownExpense = ownExpenseResponse.body as TransactionResponse;

    const invalidUpdateResponse = await request(server)
      .patch(`/api/transactions/${ownExpense.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'INCOME',
      })
      .expect(400);
    const invalidUpdateBody = invalidUpdateResponse.body as ErrorResponse;

    expect(invalidUpdateBody).toMatchObject({
      error: 'Requisicao invalida',
      statusCode: 400,
    });

    const foreignDeleteResponse = await request(server)
      .delete(`/api/transactions/${otherTransaction.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
    const foreignDeleteBody = foreignDeleteResponse.body as ErrorResponse;

    expect(foreignDeleteBody).toMatchObject({
      error: 'Nao encontrado',
      statusCode: 404,
    });
  });

  it('rejects invalid UUID parameters and identifiers on transaction routes', async () => {
    const server = harness.app.getHttpServer() as Server;
    const { token } = await harness.createAuthenticatedUser({
      email: 'uuid-check@example.com',
      name: 'UUID Check',
    });
    const expenseCategory = await harness.findSystemCategory(
      'Alimenta\u00e7\u00e3o',
    );

    const invalidCategoryIdResponse = await request(server)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 10,
        categoryId: 'invalid-uuid',
        description: 'UUID invalido',
        type: 'EXPENSE',
      })
      .expect(400);
    const invalidCategoryIdBody =
      invalidCategoryIdResponse.body as ErrorResponse;

    expect(invalidCategoryIdBody).toMatchObject({
      error: 'Requisicao invalida',
      statusCode: 400,
    });

    const transactionResponse = await request(server)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 25,
        categoryId: expenseCategory.id,
        description: 'Transacao valida',
        type: 'EXPENSE',
      })
      .expect(201);
    const transaction = transactionResponse.body as TransactionResponse;

    await request(server)
      .get('/api/transactions/invalid-uuid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    await request(server)
      .patch('/api/transactions/invalid-uuid')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Nao importa',
      })
      .expect(400);

    await request(server)
      .delete('/api/transactions/invalid-uuid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    await request(server)
      .patch(`/api/transactions/${transaction.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: 'invalid-uuid',
      })
      .expect(400);
  });
});
