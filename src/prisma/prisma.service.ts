import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL nao esta definida nas variaveis de ambiente',
      );
    }
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    this.logger.log(
      'Conectando ao banco PostgreSQL usando o adaptador pg do Prisma 7...',
    );
    await this.$connect();
  }

  async onModuleDestroy() {
    this.logger.log('Desconectando do banco PostgreSQL...');
    await this.$disconnect();
    // Close the connection pool
    await this.pool.end();
  }
}
