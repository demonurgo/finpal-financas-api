import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TransactionType } from '../../generated/prisma/client';

export class CreateTransactionDto {
  @ApiProperty({
    example: 149.9,
    description: 'Valor da transacao em formato decimal.',
  })
  @IsNumber({}, { message: 'valor deve ser um numero' })
  @IsNotEmpty({ message: 'valor e obrigatorio' })
  amount!: number;

  @ApiProperty({
    enum: TransactionType,
    enumName: 'TransactionType',
    example: TransactionType.EXPENSE,
    description: 'Define se o valor representa uma receita ou despesa.',
  })
  @IsEnum(TransactionType, {
    message: 'tipo deve ser um valor valido: INCOME ou EXPENSE',
  })
  @IsNotEmpty({ message: 'tipo e obrigatorio' })
  type!: TransactionType;

  @ApiPropertyOptional({
    example: 'Almoco com cliente',
    description: 'Observacao opcional em texto livre associada a transacao.',
  })
  @IsString({ message: 'descricao deve ser um texto' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: '2026-04-15T12:00:00.000Z',
    format: 'date-time',
    description:
      'Data opcional da transacao. Quando omitida, o servidor usa o horario atual.',
  })
  @IsDateString({}, { message: 'data deve estar em um formato de data valido' })
  @IsOptional()
  date?: string;

  @ApiProperty({
    example: '52f24fe2-76d7-48e7-b4ba-b4a76a0375e2',
    format: 'uuid',
    description: 'Identificador de uma categoria compativel do sistema ou do usuario.',
  })
  @IsString({ message: 'categoryId deve ser um texto' })
  @IsNotEmpty({ message: 'categoryId e obrigatorio' })
  categoryId!: string;
}
