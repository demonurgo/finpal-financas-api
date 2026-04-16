import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    example: 'a4d1c7fd-5ef5-4dcb-b275-df3fd90dd0f2',
    format: 'uuid',
    description: 'Identificador unico do usuario.',
  })
  id!: string;

  @ApiProperty({
    example: 'Maria Souza',
    description: 'Nome exibido do usuario.',
  })
  name!: string;

  @ApiProperty({
    example: 'maria.souza@example.com',
    description: 'Endereco de e-mail do usuario.',
  })
  email!: string;

  @ApiProperty({
    example: '2026-04-15T12:30:00.000Z',
    format: 'date-time',
    description: 'Data e hora em que a conta foi criada.',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-04-15T12:30:00.000Z',
    format: 'date-time',
    description: 'Data e hora da ultima atualizacao do usuario.',
  })
  updatedAt!: Date;
}
