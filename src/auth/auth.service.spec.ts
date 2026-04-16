import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

type MockedUsersService = Pick<UsersService, 'create' | 'findByEmail'> & {
  create: jest.Mock;
  findByEmail: jest.Mock;
};

type MockedJwtService = Pick<JwtService, 'sign'> & {
  sign: jest.Mock;
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: MockedUsersService;
  let jwtService: MockedJwtService;

  beforeEach(() => {
    usersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
    } as MockedUsersService;

    jwtService = {
      sign: jest.fn(),
    } as MockedJwtService;

    service = new AuthService(usersService, jwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('hashes the password before creating a user', async () => {
    const registerDto: RegisterDto = {
      name: 'Maria Souza',
      email: 'maria@example.com',
      password: 'plain-password',
    };
    const createdUser = {
      id: 'user-1',
      name: registerDto.name,
      email: registerDto.email,
      createdAt: new Date('2026-04-15T12:00:00.000Z'),
      updatedAt: new Date('2026-04-15T12:00:00.000Z'),
    };

    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password');
    usersService.create.mockResolvedValue(createdUser);

    await expect(service.register(registerDto)).resolves.toEqual(createdUser);

    expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
    expect(usersService.create).toHaveBeenCalledWith({
      ...registerDto,
      password: 'hashed-password',
    });
  });

  it('propagates registration errors such as duplicate email failures', async () => {
    const registerDto: RegisterDto = {
      name: 'Maria Souza',
      email: 'maria@example.com',
      password: 'plain-password',
    };
    const duplicateEmailError = new Error('Duplicate email');

    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password');
    usersService.create.mockRejectedValue(duplicateEmailError);

    await expect(service.register(registerDto)).rejects.toThrow(
      duplicateEmailError,
    );
  });

  it('throws UnauthorizedException when login user is not found', async () => {
    const loginDto: LoginDto = {
      email: 'missing@example.com',
      password: 'plain-password',
    };

    usersService.findByEmail.mockResolvedValue(null);

    await expect(service.login(loginDto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when password comparison fails', async () => {
    const loginDto: LoginDto = {
      email: 'maria@example.com',
      password: 'wrong-password',
    };

    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: loginDto.email,
      password: 'stored-hash',
    });
    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(service.login(loginDto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(bcrypt.compare).toHaveBeenCalledWith(
      loginDto.password,
      'stored-hash',
    );
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('returns a signed access token for valid credentials', async () => {
    const loginDto: LoginDto = {
      email: 'maria@example.com',
      password: 'correct-password',
    };
    const user = {
      id: 'user-1',
      email: loginDto.email,
      password: 'stored-hash',
    };

    usersService.findByEmail.mockResolvedValue(user);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    jwtService.sign.mockReturnValue('signed-token');

    await expect(service.login(loginDto)).resolves.toEqual({
      access_token: 'signed-token',
    });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
    });
  });
});
