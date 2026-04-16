import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'maria.souza@example.com',
    description: 'Endereco de e-mail ja cadastrado.',
  })
  @IsEmail({}, { message: 'email deve ser um endereco de e-mail valido' })
  @IsNotEmpty({ message: 'email e obrigatorio' })
  email!: string;

  @ApiProperty({
    example: 'SenhaForte123',
    description: 'Senha associada ao e-mail informado.',
  })
  @IsString({ message: 'senha deve ser um texto' })
  @IsNotEmpty({ message: 'senha e obrigatoria' })
  password!: string;
}
