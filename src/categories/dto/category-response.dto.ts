import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '../../generated/prisma/client';

export class CategoryResponseDto {
  @ApiProperty({
    example: '52f24fe2-76d7-48e7-b4ba-b4a76a0375e2',
    format: 'uuid',
    description: 'Identificador unico da categoria.',
  })
  id!: string;

  @ApiProperty({
    example: 'Freela',
    description: 'Nome visivel da categoria.',
  })
  name!: string;

  @ApiProperty({
    enum: TransactionType,
    enumName: 'TransactionType',
    example: TransactionType.INCOME,
    description: 'Tipo da categoria usado para validar transacoes compativeis.',
  })
  type!: TransactionType;

  @ApiProperty({
    example: false,
    description: 'Indica se a categoria foi criada pelo sistema.',
  })
  isSystem!: boolean;

  @ApiProperty({
    example: 'a4d1c7fd-5ef5-4dcb-b275-df3fd90dd0f2',
    format: 'uuid',
    nullable: true,
    description:
      'Identificador do usuario dono. Categorias do sistema retornam null.',
  })
  userId!: string | null;

  @ApiProperty({
    example: '2026-04-15T12:30:00.000Z',
    format: 'date-time',
    description: 'Data e hora em que a categoria foi criada.',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-04-15T12:30:00.000Z',
    format: 'date-time',
    description: 'Data e hora da ultima atualizacao da categoria.',
  })
  updatedAt!: Date;
}
