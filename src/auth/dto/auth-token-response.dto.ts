import { ApiProperty } from '@nestjs/swagger';

export class AuthTokenResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.signature',
    description:
      'Token JWT de acesso para enviar como Bearer nas rotas protegidas.',
  })
  access_token!: string;
}
