import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '../generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.create({
      data: {
        ...data,
        email: this.normalizeEmail(data.email),
      },
    });

    return {
      createdAt: user.createdAt,
      email: user.email,
      id: user.id,
      name: user.name,
      updatedAt: user.updatedAt,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) },
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
