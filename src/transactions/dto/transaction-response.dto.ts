import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../generated/prisma/client';
import { TransactionCategoryResponseDto } from './transaction-category-response.dto';

export class TransactionResponseDto {
  @ApiProperty({
    example: '84ff8fd0-6ef1-4a1d-8503-b44dc8daa5fb',
    format: 'uuid',
    description: 'Identificador unico da transacao.',
  })
  id!: string;

  @ApiProperty({
    example: '149.90',
    description: 'Valor decimal serializado como texto pelo Prisma.',
  })
  amount!: string;

  @ApiProperty({
    enum: TransactionType,
    enumName: 'TransactionType',
    example: TransactionType.EXPENSE,
    description: 'Tipo da transacao.',
  })
  type!: TransactionType;

  @ApiPropertyOptional({
    example: 'Almoco com cliente',
    nullable: true,
    description: 'Descricao opcional da transacao.',
  })
  description?: string | null;

  @ApiProperty({
    example: '2026-04-15T12:00:00.000Z',
    format: 'date-time',
    description: 'Data da transacao armazenada pela API.',
  })
  date!: Date;

  @ApiProperty({
    example: 'a4d1c7fd-5ef5-4dcb-b275-df3fd90dd0f2',
    format: 'uuid',
    description: 'Identificador do usuario dono.',
  })
  userId!: string;

  @ApiProperty({
    example: '52f24fe2-76d7-48e7-b4ba-b4a76a0375e2',
    format: 'uuid',
    description: 'Identificador da categoria associada.',
  })
  categoryId!: string;

  @ApiProperty({
    example: '2026-04-15T12:30:00.000Z',
    format: 'date-time',
    description: 'Data e hora em que a transacao foi criada.',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-04-15T12:30:00.000Z',
    format: 'date-time',
    description: 'Data e hora da ultima atualizacao da transacao.',
  })
  updatedAt!: Date;
}

export class TransactionWithCategoryResponseDto extends TransactionResponseDto {
  @ApiProperty({
    type: TransactionCategoryResponseDto,
    description:
      'Dados expandidos da categoria incluidos nas rotas de detalhe e listagem.',
  })
  category!: TransactionCategoryResponseDto;
}
