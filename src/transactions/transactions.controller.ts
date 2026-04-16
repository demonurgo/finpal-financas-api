import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FindTransactionsDto } from './dto/find-transactions.dto';
import { SummaryTransactionsDto } from './dto/summary-transactions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../generated/prisma/client';
import {
  ApiErrorResponseDto,
  ValidationErrorResponseDto,
} from '../common/dto/api-error-response.dto';
import {
  TransactionResponseDto,
  TransactionWithCategoryResponseDto,
} from './dto/transaction-response.dto';
import { PaginatedTransactionsResponseDto } from './dto/paginated-transactions-response.dto';
import { TransactionSummaryResponseDto } from './dto/transaction-summary-response.dto';

@ApiTags('Transacoes')
@ApiBearerAuth('access-token')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar uma transacao',
    description:
      'Cria uma transacao vinculada a uma categoria do sistema ou do usuario.',
  })
  @ApiCreatedResponse({
    description: 'Transacao criada com sucesso.',
    type: TransactionResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'O corpo da requisicao falhou na validacao ou a combinacao entre categoria e tipo e invalida.',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token Bearer ausente, invalido ou expirado.',
    type: ApiErrorResponseDto,
  })
  create(
    @CurrentUser() user: User,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(user.id, createTransactionDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar transacoes com paginacao e filtros',
    description:
      'Retorna transacoes paginadas com filtros por tipo, categoria, mes e ano.',
  })
  @ApiOkResponse({
    description: 'Transacoes retornadas com sucesso.',
    type: PaginatedTransactionsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Um ou mais parametros da query estao invalidos.',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token Bearer ausente, invalido ou expirado.',
    type: ApiErrorResponseDto,
  })
  findAll(@CurrentUser() user: User, @Query() query: FindTransactionsDto) {
    return this.transactionsService.findAll(user.id, query);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Obter o resumo financeiro',
    description:
      'Retorna o total de receitas, despesas e saldo do usuario autenticado, com filtro opcional por mes e ano.',
  })
  @ApiOkResponse({
    description: 'Resumo retornado com sucesso.',
    type: TransactionSummaryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Um ou mais parametros da query estao invalidos.',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token Bearer ausente, invalido ou expirado.',
    type: ApiErrorResponseDto,
  })
  getSummary(
    @CurrentUser() user: User,
    @Query() query: SummaryTransactionsDto,
  ) {
    return this.transactionsService.getSummary(user.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter uma transacao especifica',
    description:
      'Retorna uma transacao do usuario autenticado, incluindo os detalhes da categoria.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador da transacao.',
  })
  @ApiOkResponse({
    description: 'Transacao retornada com sucesso.',
    type: TransactionWithCategoryResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'A transacao nao existe ou nao pertence ao usuario autenticado.',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token Bearer ausente, invalido ou expirado.',
    type: ApiErrorResponseDto,
  })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: User,
  ) {
    return this.transactionsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar uma transacao especifica',
    description: 'Atualiza uma transacao pertencente ao usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador da transacao.',
  })
  @ApiOkResponse({
    description: 'Transacao atualizada com sucesso.',
    type: TransactionResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'O corpo da requisicao falhou na validacao ou a combinacao entre categoria e tipo e invalida.',
    type: ValidationErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'A transacao nao existe ou nao pertence ao usuario autenticado.',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token Bearer ausente, invalido ou expirado.',
    type: ApiErrorResponseDto,
  })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: User,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, user.id, updateTransactionDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Excluir uma transacao especifica',
    description: 'Exclui uma transacao pertencente ao usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador da transacao.',
  })
  @ApiOkResponse({
    description: 'Transacao excluida com sucesso.',
    type: TransactionResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'A transacao nao existe ou nao pertence ao usuario autenticado.',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token Bearer ausente, invalido ou expirado.',
    type: ApiErrorResponseDto,
  })
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: User,
  ) {
    return this.transactionsService.remove(id, user.id);
  }
}
