import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '../../generated/prisma/client';

export class TransactionCategoryResponseDto {
  @ApiProperty({
    example: '52f24fe2-76d7-48e7-b4ba-b4a76a0375e2',
    format: 'uuid',
    description: 'Identificador da categoria associada a transacao.',
  })
  id!: string;

  @ApiProperty({
    example: 'Alimentacao',
    description: 'Nome exibido da categoria.',
  })
  name!: string;

  @ApiProperty({
    enum: TransactionType,
    enumName: 'TransactionType',
    example: TransactionType.EXPENSE,
    description: 'Tipo da categoria usado para validar a transacao.',
  })
  type!: TransactionType;

  @ApiProperty({
    example: true,
    description:
      'Indica se a categoria pertence ao catalogo padrao do sistema.',
  })
  isSystem!: boolean;
}
