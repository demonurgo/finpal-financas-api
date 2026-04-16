import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FindTransactionsDto } from './dto/find-transactions.dto';
import { SummaryTransactionsDto } from './dto/summary-transactions.dto';

@Injectable()
export class TransactionsService {
  /* istanbul ignore next -- branch artifact from TS constructor emit */
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: CreateTransactionDto) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: data.categoryId,
        OR: [{ isSystem: true }, { userId }],
      },
    });

    if (!category) {
      throw new BadRequestException('Categoria invalida.');
    }

    if (category.type !== data.type) {
      throw new BadRequestException(
        'O tipo da transacao nao corresponde ao tipo da categoria.',
      );
    }

    return this.prisma.transaction.create({
      data: {
        ...data,
        date: data.date ? new Date(data.date) : new Date(),
        userId,
      },
    });
  }

  async findAll(userId: string, query: FindTransactionsDto) {
    const { page = 1, limit = 10, month, year, categoryId, type } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = { userId };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (type) {
      where.type = type;
    }

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      where.date = { gte: startDate, lte: endDate };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      where.date = { gte: startDate, lte: endDate };
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: { category: true },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSummary(userId: string, query: SummaryTransactionsDto) {
    const { month, year } = query;
    const where: Prisma.TransactionWhereInput = { userId };

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      where.date = { gte: startDate, lte: endDate };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      where.date = { gte: startDate, lte: endDate };
    }

    const aggregations = await this.prisma.transaction.groupBy({
      by: ['type'],
      where,
      _sum: {
        amount: true,
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    aggregations.forEach((agg) => {
      if (agg.type === 'INCOME') totalIncome = Number(agg._sum.amount) || 0;
      if (agg.type === 'EXPENSE') totalExpense = Number(agg._sum.amount) || 0;
    });

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }

  async findOne(id: string, userId: string) {
    const trx = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    });
    if (!trx) throw new NotFoundException('Transacao nao encontrada');
    return trx;
  }

  async update(id: string, userId: string, data: UpdateTransactionDto) {
    const trx = await this.prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!trx) throw new NotFoundException('Transacao nao encontrada');

    if (data.categoryId || data.type) {
      const effectiveCategoryId = data.categoryId ?? trx.categoryId;
      const category = await this.prisma.category.findFirst({
        where: {
          id: effectiveCategoryId,
          OR: [{ isSystem: true }, { userId }],
        },
      });

      if (!category) throw new BadRequestException('Categoria invalida.');

      const newType = data.type ?? trx.type;
      if (category.type !== newType) {
        throw new BadRequestException(
          'O tipo da transacao nao corresponde ao tipo da categoria.',
        );
      }
    }

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
  }

  async remove(id: string, userId: string) {
    const trx = await this.prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!trx) throw new NotFoundException('Transacao nao encontrada');
    return this.prisma.transaction.delete({ where: { id } });
  }
}
