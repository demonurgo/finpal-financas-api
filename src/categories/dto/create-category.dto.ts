import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { TransactionType } from '../../generated/prisma/client';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Freela',
    description: 'Nome da categoria exibido para o usuario.',
  })
  @IsString({ message: 'nome deve ser um texto' })
  @IsNotEmpty({ message: 'nome e obrigatorio' })
  name!: string;

  @ApiProperty({
    enum: TransactionType,
    enumName: 'TransactionType',
    example: TransactionType.INCOME,
    description: 'Tipo de transacao aceito por esta categoria.',
  })
  @IsEnum(TransactionType, {
    message: 'tipo deve ser um valor valido: INCOME ou EXPENSE',
  })
  @IsNotEmpty({ message: 'tipo e obrigatorio' })
  type!: TransactionType;
}
