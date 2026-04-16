import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class RegisterDto {
  @ApiProperty({
    example: 'Maria Souza',
    description: 'Nome completo exibido no perfil do usuario.',
  })
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString({ message: 'nome deve ser um texto' })
  @IsNotEmpty({ message: 'nome e obrigatorio' })
  name!: string;

  @ApiProperty({
    example: 'maria.souza@example.com',
    description: 'Endereco de e-mail unico usado para autenticar a conta.',
  })
  @Transform(({ value }: { value: unknown }) => normalizeEmail(value))
  @IsEmail({}, { message: 'email deve ser um endereco de e-mail valido' })
  @IsNotEmpty({ message: 'email e obrigatorio' })
  email!: string;

  @ApiProperty({
    example: 'SenhaForte123',
    minLength: 6,
    description:
      'Senha em texto puro que sera criptografada antes de ser salva.',
  })
  @IsString({ message: 'senha deve ser um texto' })
  @MinLength(6, { message: 'senha deve ter no minimo 6 caracteres' })
  password!: string;
}
