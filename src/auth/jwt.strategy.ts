import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_SECRET deve estar definido nas variaveis de ambiente',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.usersService.findByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException('O usuario nao existe mais');
    }

    return {
      createdAt: user.createdAt,
      email: user.email,
      id: user.id,
      name: user.name,
      updatedAt: user.updatedAt,
    };
  }
}
