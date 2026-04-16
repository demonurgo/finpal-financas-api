import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({
    example: 'up',
    description: 'Estado geral da aplicacao.',
  })
  status!: 'up';

  @ApiProperty({
    example: 'up',
    description: 'Estado da conexao com o banco de dados.',
  })
  database!: 'up';

  @ApiProperty({
    example: '2026-04-16T12:00:00.000Z',
    description: 'Horario ISO em que a verificacao foi executada.',
  })
  timestamp!: string;
}
