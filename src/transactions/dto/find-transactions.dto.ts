import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '../../generated/prisma/client';

export class FindTransactionsDto {
  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    description: 'Numero da pagina usada na paginacao.',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'page deve ser um numero' })
  @Min(1, { message: 'page deve ser maior ou igual a 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 100,
    description: 'Quantidade maxima de transacoes retornadas por pagina.',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'limit deve ser um numero' })
  @Min(1, { message: 'limit deve ser maior ou igual a 1' })
  @Max(100, { message: 'limit deve ser menor ou igual a 100' })
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 4,
    minimum: 1,
    maximum: 12,
    description: 'Filtro opcional de mes aplicado junto com o ano.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'month deve ser um numero' })
  @Min(1, { message: 'month deve ser maior ou igual a 1' })
  @Max(12, { message: 'month deve ser menor ou igual a 12' })
  month?: number;

  @ApiPropertyOptional({
    example: 2026,
    minimum: 2000,
    description:
      'Filtro opcional de ano. Pode ser usado sozinho ou junto com o mes.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'year deve ser um numero' })
  @Min(2000, { message: 'year deve ser maior ou igual a 2000' })
  year?: number;

  @ApiPropertyOptional({
    example: '52f24fe2-76d7-48e7-b4ba-b4a76a0375e2',
    format: 'uuid',
    description: 'Filtra as transacoes pelo identificador da categoria.',
  })
  @IsOptional()
  @IsString({ message: 'categoryId deve ser um texto' })
  categoryId?: string;

  @ApiPropertyOptional({
    enum: TransactionType,
    enumName: 'TransactionType',
    example: TransactionType.EXPENSE,
    description: 'Filtra as transacoes pelo tipo da transacao.',
  })
  @IsOptional()
  @IsEnum(TransactionType, {
    message: 'tipo deve ser um valor valido: INCOME ou EXPENSE',
  })
  type?: TransactionType;
}
