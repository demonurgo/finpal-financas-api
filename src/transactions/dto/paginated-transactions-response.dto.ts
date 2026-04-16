import { ApiProperty } from '@nestjs/swagger';
import { TransactionWithCategoryResponseDto } from './transaction-response.dto';

export class TransactionPaginationMetaDto {
  @ApiProperty({
    example: 24,
    description: 'Quantidade total de transacoes que correspondem aos filtros aplicados.',
  })
  total!: number;

  @ApiProperty({
    example: 1,
    description: 'Numero da pagina atual.',
  })
  page!: number;

  @ApiProperty({
    example: 10,
    description: 'Quantidade maxima de itens retornados na pagina atual.',
  })
  limit!: number;

  @ApiProperty({
    example: 3,
    description: 'Quantidade total de paginas disponiveis para o filtro atual.',
  })
  totalPages!: number;
}

export class PaginatedTransactionsResponseDto {
  @ApiProperty({
    type: [TransactionWithCategoryResponseDto],
    description: 'Transacoes retornadas para a pagina solicitada.',
  })
  data!: TransactionWithCategoryResponseDto[];

  @ApiProperty({
    type: TransactionPaginationMetaDto,
    description: 'Metadados de paginacao da consulta atual.',
  })
  meta!: TransactionPaginationMetaDto;
}
