import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const normalizedEmail = this.normalizeEmail(registerDto.email);
    const normalizedName = this.normalizeName(registerDto.name);
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    return this.usersService.create({
      ...registerDto,
      email: normalizedEmail,
      name: normalizedName,
      password: hashedPassword,
    });
  }

  async login(loginDto: LoginDto) {
    const normalizedEmail = this.normalizeEmail(loginDto.email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeName(name: string): string {
    return name.trim();
  }
}
