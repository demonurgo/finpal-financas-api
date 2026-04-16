import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '../../generated/prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ocorreu um erro inesperado no banco de dados';

    switch (exception.code) {
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[]) || [];
        message = `Ja existe um registro com este(s) campo(s): ${target.join(', ')}`;
        break;
      }
      case 'P2025': {
        status = HttpStatus.NOT_FOUND;
        message = 'Registro nao encontrado';
        break;
      }
      case 'P2003': {
        status = HttpStatus.BAD_REQUEST;
        message =
          'Registro relacionado nao encontrado - verifique as referencias de chave estrangeira';
        break;
      }
      default:
        break;
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: this.getErrorName(status),
    });
  }

  private getErrorName(status: HttpStatus): string {
    const names: Record<number, string> = {
      [HttpStatus.CONFLICT]: 'Conflito',
      [HttpStatus.NOT_FOUND]: 'Nao encontrado',
      [HttpStatus.BAD_REQUEST]: 'Requisicao invalida',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Erro interno do servidor',
    };
    return names[status] || 'Erro';
  }
}
