import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

type CategoryPrismaMock = {
  create: jest.Mock;
  findMany: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

type TransactionPrismaMock = {
  count: jest.Mock;
};

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: CategoryPrismaMock;
    transaction: TransactionPrismaMock;
  };

  beforeEach(() => {
    prisma = {
      category: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      transaction: {
        count: jest.fn(),
      },
    };

    service = new CategoriesService(prisma as unknown as PrismaService);
  });

  it('creates a user-owned category with isSystem set to false', async () => {
    const userId = 'user-1';
    const dto: CreateCategoryDto = {
      name: 'Freelance',
      type: TransactionType.INCOME,
    };
    const createdCategory = {
      id: 'category-1',
      ...dto,
      isSystem: false,
      userId,
    };

    prisma.category.create.mockResolvedValue(createdCategory);

    await expect(service.create(userId, dto)).resolves.toEqual(createdCategory);
    expect(prisma.category.create).toHaveBeenCalledWith({
      data: {
        ...dto,
        userId,
        isSystem: false,
      },
    });
  });

  it('lists system and user categories ordered by system flag then name', async () => {
    const userId = 'user-1';
    const categories = [
      { id: 'system-1', name: 'Food', isSystem: true },
      { id: 'custom-1', name: 'Freelance', isSystem: false, userId },
    ];

    prisma.category.findMany.mockResolvedValue(categories);

    await expect(service.findAll(userId)).resolves.toEqual(categories);
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ isSystem: true }, { userId }],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  });

  it('updates a mutable user-owned category', async () => {
    const userId = 'user-1';
    const id = 'category-1';
    const dto: UpdateCategoryDto = { name: 'Consulting' };
    const existingCategory = {
      id,
      name: 'Freelance',
      type: TransactionType.INCOME,
      isSystem: false,
      userId,
    };
    const updatedCategory = { ...existingCategory, ...dto };

    prisma.category.findUnique.mockResolvedValue(existingCategory);
    prisma.category.update.mockResolvedValue(updatedCategory);

    await expect(service.update(id, userId, dto)).resolves.toEqual(
      updatedCategory,
    );
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id },
      data: dto,
    });
  });

  it('throws NotFoundException when updating a missing category', async () => {
    prisma.category.findUnique.mockResolvedValue(null);

    await expect(
      service.update('missing-category', 'user-1', { name: 'Anything' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.category.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when updating a foreign category', async () => {
    prisma.category.findUnique.mockResolvedValue({
      id: 'category-1',
      name: 'Foreign',
      type: TransactionType.EXPENSE,
      isSystem: false,
      userId: 'another-user',
    });

    await expect(
      service.update('category-1', 'user-1', { name: 'Anything' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.category.update).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when updating a system category', async () => {
    prisma.category.findUnique.mockResolvedValue({
      id: 'category-1',
      name: 'Food',
      type: TransactionType.EXPENSE,
      isSystem: true,
      userId: null,
    });

    await expect(
      service.update('category-1', 'user-1', { name: 'Anything' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.category.update).not.toHaveBeenCalled();
  });

  it('removes a mutable user-owned category', async () => {
    const userId = 'user-1';
    const deletedCategory = {
      id: 'category-1',
      name: 'Freelance',
      type: TransactionType.INCOME,
      isSystem: false,
      userId,
    };

    prisma.category.findUnique.mockResolvedValue(deletedCategory);
    prisma.transaction.count.mockResolvedValue(0);
    prisma.category.delete.mockResolvedValue(deletedCategory);

    await expect(service.remove('category-1', userId)).resolves.toEqual(
      deletedCategory,
    );
    expect(prisma.transaction.count).toHaveBeenCalledWith({
      where: { categoryId: 'category-1' },
    });
    expect(prisma.category.delete).toHaveBeenCalledWith({
      where: { id: 'category-1' },
    });
  });

  it('throws ConflictException when removing a category with linked transactions', async () => {
    prisma.category.findUnique.mockResolvedValue({
      id: 'category-1',
      name: 'Freelance',
      type: TransactionType.INCOME,
      isSystem: false,
      userId: 'user-1',
    });
    prisma.transaction.count.mockResolvedValue(2);

    await expect(service.remove('category-1', 'user-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when removing a foreign category', async () => {
    prisma.category.findUnique.mockResolvedValue({
      id: 'category-1',
      name: 'Foreign',
      type: TransactionType.EXPENSE,
      isSystem: false,
      userId: 'another-user',
    });

    await expect(service.remove('category-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when removing a system category', async () => {
    prisma.category.findUnique.mockResolvedValue({
      id: 'category-1',
      name: 'Food',
      type: TransactionType.EXPENSE,
      isSystem: true,
      userId: null,
    });

    await expect(service.remove('category-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });
});
