import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SummaryTransactionsDto {
  @ApiPropertyOptional({
    example: 4,
    minimum: 1,
    maximum: 12,
    description: 'Filtro opcional de mes para o resumo financeiro.',
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
    description: 'Filtro opcional de ano para o resumo financeiro.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'year deve ser um numero' })
  @Min(2000, { message: 'year deve ser maior ou igual a 2000' })
  year?: number;
}
