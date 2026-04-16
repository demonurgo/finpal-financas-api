import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';
import { HealthResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

@ApiTags('Infraestrutura')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Verificar a saude da API',
    description:
      'Executa um ping simples na API e no banco de dados para indicar disponibilidade.',
  })
  @ApiOkResponse({
    description: 'Aplicacao e banco de dados disponiveis.',
    type: HealthResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description:
      'Aplicacao ativa, mas a dependencia de banco esta indisponivel.',
    type: ApiErrorResponseDto,
  })
  getStatus() {
    return this.healthService.check();
  }
}
