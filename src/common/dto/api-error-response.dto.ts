import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({
    example: 401,
    description: 'Codigo HTTP retornado pela API.',
  })
  statusCode!: number;

  @ApiProperty({
    example: 'Credenciais invalidas',
    description: 'Mensagem de erro legivel para humanos.',
  })
  message!: string;

  @ApiProperty({
    example: 'Nao autorizado',
    description: 'Rotulo padrao do erro HTTP.',
  })
  error!: string;
}

export class ValidationErrorResponseDto {
  @ApiProperty({
    example: 400,
    description: 'Codigo HTTP retornado pela camada de validacao.',
  })
  statusCode!: number;

  @ApiProperty({
    type: [String],
    example: [
      'email deve ser um endereco de e-mail valido',
      'senha deve ter no minimo 6 caracteres',
    ],
    description: 'Mensagens de validacao geradas pelo class-validator.',
  })
  message!: string[];

  @ApiProperty({
    example: 'Requisicao invalida',
    description: 'Rotulo padrao do erro HTTP.',
  })
  error!: string;

  @ApiPropertyOptional({
    type: [String],
    example: [
      'email deve ser um endereco de e-mail valido',
      'senha deve ter no minimo 6 caracteres',
    ],
    description:
      'Mensagens detalhadas de validacao por campo preservadas pelo filtro de excecao HTTP.',
  })
  details?: string[];
}
