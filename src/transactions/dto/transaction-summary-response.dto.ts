import { ApiProperty } from '@nestjs/swagger';

export class TransactionSummaryResponseDto {
  @ApiProperty({
    example: 5400,
    description: 'Soma de todas as receitas no periodo selecionado.',
  })
  totalIncome!: number;

  @ApiProperty({
    example: 2100.75,
    description: 'Soma de todas as despesas no periodo selecionado.',
  })
  totalExpense!: number;

  @ApiProperty({
    example: 3299.25,
    description:
      'Saldo atual calculado como totalIncome menos totalExpense.',
  })
  balance!: number;
}
