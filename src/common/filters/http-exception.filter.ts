import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const error =
      typeof exceptionResponse === 'string'
        ? { message: exceptionResponse }
        : (exceptionResponse as Record<string, unknown>);

    response.status(status).json({
      statusCode: status,
      message: error.message || 'Ocorreu um erro',
      error: this.getErrorName(status),
      ...(error.message !== error.error && Array.isArray(error.message)
        ? { details: error.message }
        : {}),
    });
  }

  private getErrorName(status: HttpStatus): string {
    const names: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Requisicao invalida',
      [HttpStatus.UNAUTHORIZED]: 'Nao autorizado',
      [HttpStatus.FORBIDDEN]: 'Proibido',
      [HttpStatus.NOT_FOUND]: 'Nao encontrado',
      [HttpStatus.CONFLICT]: 'Conflito',
      [HttpStatus.TOO_MANY_REQUESTS]: 'Muitas requisicoes',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'Servico indisponivel',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Erro interno do servidor',
    };
    return names[status] || 'Erro';
  }
}
