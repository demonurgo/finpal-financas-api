import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FindTransactionsDto } from './dto/find-transactions.dto';
import { SummaryTransactionsDto } from './dto/summary-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

type TransactionsPrismaMock = {
  category: {
    findFirst: jest.Mock;
  };
  transaction: {
    create: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    groupBy: jest.Mock;
  };
};

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: TransactionsPrismaMock;

  beforeEach(() => {
    prisma = {
      category: {
        findFirst: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    service = new TransactionsService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('throws BadRequestException when creating a transaction with an invalid category', async () => {
    const dto: CreateTransactionDto = {
      amount: 150,
      type: 'EXPENSE',
      categoryId: 'missing-category',
      description: 'Lunch',
    };

    prisma.category.findFirst.mockResolvedValue(null);

    await expect(service.create('user-1', dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when transaction type does not match category type', async () => {
    const dto: CreateTransactionDto = {
      amount: 150,
      type: 'EXPENSE',
      categoryId: 'category-1',
      description: 'Lunch',
    };

    prisma.category.findFirst.mockResolvedValue({
      id: 'category-1',
      type: 'INCOME',
      isSystem: true,
    });

    await expect(service.create('user-1', dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('creates a transaction using the current date when no explicit date is provided', async () => {
    const fixedDate = new Date('2026-04-15T10:30:00.000Z');
    const dto: CreateTransactionDto = {
      amount: 150,
      type: 'EXPENSE',
      categoryId: 'category-1',
      description: 'Lunch',
    };

    jest.useFakeTimers().setSystemTime(fixedDate);
    prisma.category.findFirst.mockResolvedValue({
      id: 'category-1',
      type: 'EXPENSE',
      isSystem: true,
    });
    prisma.transaction.create.mockResolvedValue({ id: 'transaction-1' });

    await service.create('user-1', dto);

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: {
        ...dto,
        date: fixedDate,
        userId: 'user-1',
      },
    });
  });

  it('creates a transaction converting an explicit ISO date string', async () => {
    const dto: CreateTransactionDto = {
      amount: 999.99,
      type: 'INCOME',
      categoryId: 'category-1',
      description: 'Salary',
      date: '2026-04-01T12:00:00.000Z',
    };

    prisma.category.findFirst.mockResolvedValue({
      id: 'category-1',
      type: 'INCOME',
      isSystem: true,
    });
    prisma.transaction.create.mockResolvedValue({ id: 'transaction-1' });

    await service.create('user-1', dto);

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: {
        ...dto,
        date: new Date(dto.date),
        userId: 'user-1',
      },
    });
  });

  it('lists transactions with paginated filters and calculated metadata', async () => {
    const query: FindTransactionsDto = {
      page: 2,
      limit: 10,
      month: 4,
      year: 2026,
      categoryId: 'category-1',
      type: 'EXPENSE',
    };
    const expectedWhere = {
      userId: 'user-1',
      categoryId: 'category-1',
      type: 'EXPENSE',
      date: {
        gte: new Date(2026, 3, 1),
        lte: new Date(2026, 4, 0, 23, 59, 59, 999),
      },
    };
    const transactions = [{ id: 'transaction-1' }, { id: 'transaction-2' }];

    prisma.transaction.findMany.mockResolvedValue(transactions);
    prisma.transaction.count.mockResolvedValue(24);

    await expect(service.findAll('user-1', query)).resolves.toEqual({
      data: transactions,
      meta: {
        total: 24,
        page: 2,
        limit: 10,
        totalPages: 3,
      },
    });
    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: expectedWhere,
      skip: 10,
      take: 10,
      orderBy: { date: 'desc' },
      include: { category: true },
    });
    expect(prisma.transaction.count).toHaveBeenCalledWith({
      where: expectedWhere,
    });
  });

  it('lists transactions using a year-only date range when month is not informed', async () => {
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.transaction.count.mockResolvedValue(0);

    await expect(
      service.findAll('user-1', {
        year: 2026,
      }),
    ).resolves.toEqual({
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      },
    });

    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        date: {
          gte: new Date(2026, 0, 1),
          lte: new Date(2026, 11, 31, 23, 59, 59, 999),
        },
      },
      skip: 0,
      take: 10,
      orderBy: { date: 'desc' },
      include: { category: true },
    });
  });

  it('lists transactions without applying a date range when month and year are absent', async () => {
    prisma.transaction.findMany.mockResolvedValue([{ id: 'transaction-1' }]);
    prisma.transaction.count.mockResolvedValue(1);

    await expect(service.findAll('user-1', {})).resolves.toEqual({
      data: [{ id: 'transaction-1' }],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    });

    expect(prisma.transaction.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      skip: 0,
      take: 10,
      orderBy: { date: 'desc' },
      include: { category: true },
    });
  });

  it('throws NotFoundException when a transaction is not found by id', async () => {
    prisma.transaction.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne('transaction-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns a transaction with category details when it exists', async () => {
    const transaction = {
      id: 'transaction-1',
      type: 'INCOME',
      category: {
        id: 'category-1',
        name: 'Salario',
      },
    };

    prisma.transaction.findFirst.mockResolvedValue(transaction);

    await expect(service.findOne('transaction-1', 'user-1')).resolves.toEqual(
      transaction,
    );
    expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
      where: { id: 'transaction-1', userId: 'user-1' },
      include: { category: true },
    });
  });

  it('throws NotFoundException when updating a transaction the user does not own', async () => {
    prisma.transaction.findFirst.mockResolvedValue(null);

    await expect(
      service.update('transaction-1', 'user-1', {
        description: 'Updated',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when updating with an invalid replacement category', async () => {
    prisma.transaction.findFirst.mockResolvedValue({
      id: 'transaction-1',
      type: 'EXPENSE',
    });
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.update('transaction-1', 'user-1', {
        categoryId: 'missing-category',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when updating with a mismatched replacement category type', async () => {
    prisma.transaction.findFirst.mockResolvedValue({
      id: 'transaction-1',
      categoryId: 'current-category',
      type: 'EXPENSE',
    });
    prisma.category.findFirst.mockResolvedValue({
      id: 'category-1',
      type: 'INCOME',
      isSystem: true,
    });

    await expect(
      service.update('transaction-1', 'user-1', {
        categoryId: 'category-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when updating only the transaction type and the current category no longer matches', async () => {
    prisma.transaction.findFirst.mockResolvedValue({
      id: 'transaction-1',
      categoryId: 'current-category',
      type: 'EXPENSE',
    });
    prisma.category.findFirst.mockResolvedValue({
      id: 'current-category',
      type: 'EXPENSE',
      isSystem: true,
    });

    await expect(
      service.update('transaction-1', 'user-1', {
        type: 'INCOME',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'current-category',
        OR: [{ isSystem: true }, { userId: 'user-1' }],
      },
    });
    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });

  it('updates only the transaction type when it remains compatible with the existing category', async () => {
    prisma.transaction.findFirst.mockResolvedValue({
      id: 'transaction-1',
      categoryId: 'income-category',
      type: 'INCOME',
    });
    prisma.category.findFirst.mockResolvedValue({
      id: 'income-category',
      type: 'INCOME',
      isSystem: true,
    });
    prisma.transaction.update.mockResolvedValue({ id: 'transaction-1' });

    await service.update('transaction-1', 'user-1', {
      type: 'INCOME',
      description: 'Pagamento atualizado',
    });

    expect(prisma.transaction.update).toHaveBeenCalledWith({
      where: { id: 'transaction-1' },
      data: {
        type: 'INCOME',
        description: 'Pagamento atualizado',
        date: undefined,
      },
    });
  });

  it('updates fields unrelated to category validation without reloading category data', async () => {
    prisma.transaction.findFirst.mockResolvedValue({
      id: 'transaction-1',
      categoryId: 'expense-category',
      type: 'EXPENSE',
    });
    prisma.transaction.update.mockResolvedValue({ id: 'transaction-1' });

    await service.update('transaction-1', 'user-1', {
      description: 'Descricao simples',
    });

    expect(prisma.category.findFirst).not.toHaveBeenCalled();
    expect(prisma.transaction.update).toHaveBeenCalledWith({
      where: { id: 'transaction-1' },
      data: {
        description: 'Descricao simples',
        date: undefined,
      },
    });
  });

  it('updates a transaction and converts the explicit date string', async () => {
    const dto: UpdateTransactionDto = {
      categoryId: 'category-1',
      type: 'INCOME',
      description: 'Updated salary',
      date: '2026-04-20T08:30:00.000Z',
    };

    prisma.transaction.findFirst.mockResolvedValue({
      id: 'transaction-1',
      categoryId: 'category-1',
      type: 'EXPENSE',
    });
    prisma.category.findFirst.mockResolvedValue({
      id: 'category-1',
      type: 'INCOME',
      isSystem: true,
    });
    prisma.transaction.update.mockResolvedValue({ id: 'transaction-1' });

    await service.update('transaction-1', 'user-1', dto);

    expect(prisma.transaction.update).toHaveBeenCalledWith({
      where: { id: 'transaction-1' },
      data: {
        ...dto,
        date: new Date(dto.date),
      },
    });
  });

  it('throws NotFoundException when removing a transaction the user does not own', async () => {
    prisma.transaction.findFirst.mockResolvedValue(null);

    await expect(
      service.remove('transaction-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.transaction.delete).not.toHaveBeenCalled();
  });

  it('removes a transaction after ownership validation succeeds', async () => {
    prisma.transaction.findFirst.mockResolvedValue({
      id: 'transaction-1',
      userId: 'user-1',
    });
    prisma.transaction.delete.mockResolvedValue({ id: 'transaction-1' });

    await expect(service.remove('transaction-1', 'user-1')).resolves.toEqual({
      id: 'transaction-1',
    });
    expect(prisma.transaction.delete).toHaveBeenCalledWith({
      where: { id: 'transaction-1' },
    });
  });

  it('returns summary totals and balance from grouped transaction aggregates', async () => {
    prisma.transaction.groupBy.mockResolvedValue([
      { type: 'INCOME', _sum: { amount: 5400 } },
      { type: 'EXPENSE', _sum: { amount: 2100.75 } },
    ]);

    await expect(service.getSummary('user-1', {})).resolves.toEqual({
      totalIncome: 5400,
      totalExpense: 2100.75,
      balance: 3299.25,
    });
    expect(prisma.transaction.groupBy).toHaveBeenCalledWith({
      by: ['type'],
      where: { userId: 'user-1' },
      _sum: {
        amount: true,
      },
    });
  });

  it('falls back to zero when grouped summary values are null', async () => {
    prisma.transaction.groupBy.mockResolvedValue([
      { type: 'INCOME', _sum: { amount: null } },
      { type: 'EXPENSE', _sum: { amount: null } },
    ]);

    await expect(service.getSummary('user-1', {})).resolves.toEqual({
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
    });
  });

  it('builds the correct month and year range for summary queries', async () => {
    const query: SummaryTransactionsDto = {
      month: 4,
      year: 2026,
    };

    prisma.transaction.groupBy.mockResolvedValue([]);

    await expect(service.getSummary('user-1', query)).resolves.toEqual({
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
    });
    expect(prisma.transaction.groupBy).toHaveBeenCalledWith({
      by: ['type'],
      where: {
        userId: 'user-1',
        date: {
          gte: new Date(2026, 3, 1),
          lte: new Date(2026, 4, 0, 23, 59, 59, 999),
        },
      },
      _sum: {
        amount: true,
      },
    });
  });

  it('builds the correct year-only range for summary queries', async () => {
    prisma.transaction.groupBy.mockResolvedValue([]);

    await service.getSummary('user-1', { year: 2026 });

    expect(prisma.transaction.groupBy).toHaveBeenCalledWith({
      by: ['type'],
      where: {
        userId: 'user-1',
        date: {
          gte: new Date(2026, 0, 1),
          lte: new Date(2026, 11, 31, 23, 59, 59, 999),
        },
      },
      _sum: {
        amount: true,
      },
    });
  });
});
