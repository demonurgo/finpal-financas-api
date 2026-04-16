import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthTokenResponseDto } from './dto/auth-token-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import {
  ApiErrorResponseDto,
  ValidationErrorResponseDto,
} from '../common/dto/api-error-response.dto';
import type { User } from '../generated/prisma/client';

const REGISTER_THROTTLE = {
  default: {
    limit: 3,
    ttl: 60000,
  },
};

const LOGIN_THROTTLE = {
  default: {
    limit: 5,
    ttl: 60000,
  },
};

@ApiTags('Autenticacao')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle(REGISTER_THROTTLE)
  @ApiOperation({
    summary: 'Cadastrar um novo usuario',
    description:
      'Cria uma nova conta e retorna o perfil salvo sem expor o hash da senha. A rota aplica rate limit para reduzir abuso automatizado.',
  })
  @ApiCreatedResponse({
    description: 'Conta criada com sucesso.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'O corpo da requisicao falhou na validacao.',
    type: ValidationErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Ja existe um usuario com este e-mail.',
    type: ApiErrorResponseDto,
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(LOGIN_THROTTLE)
  @ApiOperation({
    summary: 'Entrar e obter o token JWT',
    description:
      'Autentica o usuario com e-mail e senha e retorna um token JWT de acesso. A rota aplica rate limit para reduzir tentativas de forca bruta.',
  })
  @ApiOkResponse({
    description: 'Token JWT gerado com sucesso.',
    type: AuthTokenResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'O corpo da requisicao falhou na validacao.',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'E-mail ou senha invalidos.',
    type: ApiErrorResponseDto,
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Obter o perfil do usuario autenticado',
    description: 'Retorna o usuario autenticado extraido do payload do JWT.',
  })
  @ApiOkResponse({
    description: 'Perfil do usuario autenticado.',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token Bearer ausente, invalido ou expirado.',
    type: ApiErrorResponseDto,
  })
  getProfile(@CurrentUser() user: Omit<User, 'password'>) {
    return user;
  }
}
