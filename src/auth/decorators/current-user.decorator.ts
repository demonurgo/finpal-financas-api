import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '../../generated/prisma/client';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: Omit<User, 'password'> }>();
    return request.user;
  },
);
