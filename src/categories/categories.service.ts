import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        ...data,
        userId,
        isSystem: false,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.category.findMany({
      where: {
        OR: [{ isSystem: true }, { userId }],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async update(id: string, userId: string, data: UpdateCategoryDto) {
    await this.ensureMutableCategory(id, userId);
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, userId: string) {
    await this.ensureMutableCategory(id, userId);

    const linkedTransactions = await this.prisma.transaction.count({
      where: { categoryId: id },
    });

    if (linkedTransactions > 0) {
      throw new ConflictException(
        'A categoria nao pode ser excluida porque possui transacoes vinculadas.',
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }

  private async ensureMutableCategory(id: string, userId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category || (!category.isSystem && category.userId !== userId)) {
      throw new NotFoundException(
        'Categoria nao encontrada ou voce nao tem permissao.',
      );
    }

    if (category.isSystem) {
      throw new ForbiddenException(
        'Categorias do sistema nao podem ser modificadas ou excluidas.',
      );
    }

    return category;
  }
}
