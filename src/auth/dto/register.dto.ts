import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'Maria Souza',
    description: 'Nome completo exibido no perfil do usuario.',
  })
  @IsString({ message: 'nome deve ser um texto' })
  @IsNotEmpty({ message: 'nome e obrigatorio' })
  name!: string;

  @ApiProperty({
    example: 'maria.souza@example.com',
    description: 'Endereco de e-mail unico usado para autenticar a conta.',
  })
  @IsEmail({}, { message: 'email deve ser um endereco de e-mail valido' })
  @IsNotEmpty({ message: 'email e obrigatorio' })
  email!: string;

  @ApiProperty({
    example: 'SenhaForte123',
    minLength: 6,
    description: 'Senha em texto puro que sera criptografada antes de ser salva.',
  })
  @IsString({ message: 'senha deve ser um texto' })
  @MinLength(6, { message: 'senha deve ter no minimo 6 caracteres' })
  password!: string;
}
