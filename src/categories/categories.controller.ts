import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../generated/prisma/client';
import { CategoryResponseDto } from './dto/category-response.dto';
import {
  ApiErrorResponseDto,
  ValidationErrorResponseDto,
} from '../common/dto/api-error-response.dto';

@ApiTags('Categorias')
@ApiBearerAuth('access-token')
@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar uma nova categoria',
    description:
      'Cria uma categoria personalizada pertencente ao usuario autenticado.',
  })
  @ApiCreatedResponse({
    description: 'Categoria criada com sucesso.',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'O corpo da requisicao falhou na validacao.',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token Bearer ausente, invalido ou expirado.',
    type: ApiErrorResponseDto,
  })
  create(
    @CurrentUser() user: User,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(user.id, createCategoryDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar categorias do usuario e do sistema',
    description:
      'Retorna as categorias padrao do sistema junto com as categorias personalizadas do usuario autenticado.',
  })
  @ApiOkResponse({
    description: 'Categorias retornadas com sucesso.',
    type: CategoryResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Token Bearer ausente, invalido ou expirado.',
    type: ApiErrorResponseDto,
  })
  findAll(@CurrentUser() user: User) {
    return this.categoriesService.findAll(user.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar uma categoria do usuario',
    description:
      'Atualiza uma categoria personalizada que pertence ao usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador da categoria.',
  })
  @ApiOkResponse({
    description: 'Categoria atualizada com sucesso.',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'O corpo da requisicao falhou na validacao.',
    type: ValidationErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Categorias do sistema nao podem ser modificadas.',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'A categoria nao existe ou nao pertence ao usuario autenticado.',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token Bearer ausente, invalido ou expirado.',
    type: ApiErrorResponseDto,
  })
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, user.id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Excluir uma categoria do usuario',
    description:
      'Exclui uma categoria personalizada que pertence ao usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Identificador da categoria.',
  })
  @ApiOkResponse({
    description: 'Categoria excluida com sucesso.',
    type: CategoryResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Categorias do sistema nao podem ser excluidas.',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'A categoria nao existe ou nao pertence ao usuario autenticado.',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token Bearer ausente, invalido ou expirado.',
    type: ApiErrorResponseDto,
  })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.categoriesService.remove(id, user.id);
  }
}
