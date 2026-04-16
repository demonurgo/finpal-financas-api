import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { readPositiveInteger } from './config/runtime-env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        errorMessage:
          'Muitas requisicoes em pouco tempo. Aguarde alguns instantes e tente novamente.',
        throttlers: [
          {
            ttl: readPositiveInteger(
              config.get<string>('THROTTLE_TTL_MS'),
              60000,
            ),
            limit: readPositiveInteger(
              config.get<string>('THROTTLE_LIMIT'),
              60,
            ),
          },
        ],
      }),
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    TransactionsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
