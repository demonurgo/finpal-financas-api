import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: {
    $queryRawUnsafe: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      $queryRawUnsafe: jest.fn(),
    };

    service = new HealthService(prisma as unknown as PrismaService);
  });

  it('returns an up status when the database ping succeeds', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([{ '?column?': 1 }]);

    await expect(service.check()).resolves.toMatchObject({
      database: 'up',
      status: 'up',
    });
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
  });

  it('throws ServiceUnavailableException when the database ping fails', async () => {
    prisma.$queryRawUnsafe.mockRejectedValue(new Error('db down'));

    await expect(service.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
