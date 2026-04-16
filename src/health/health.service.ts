import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
    } catch {
      throw new ServiceUnavailableException(
        'Nao foi possivel verificar a conexao com o banco de dados.',
      );
    }

    return {
      status: 'up' as const,
      database: 'up' as const,
      timestamp: new Date().toISOString(),
    };
  }
}
