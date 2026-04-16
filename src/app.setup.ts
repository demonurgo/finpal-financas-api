import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

export function configureApp(app: INestApplication): void {
  const httpServer = app.getHttpAdapter().getInstance() as {
    disable: (setting: string) => void;
  };

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          fontSrc: ["'self'", 'data:', 'https:'],
          imgSrc: ["'self'", 'data:', 'https://validator.swagger.io'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  httpServer.disable('x-powered-by');
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());
}

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('API do Finpal')
    .setDescription(
      'Documentacao interativa para autenticacao, categorias, transacoes e resumo financeiro. Endpoints de autenticacao possuem rate limit para reduzir tentativas de forca bruta.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Cole aqui o JWT retornado por POST /api/auth/login para acessar as rotas protegidas.',
      },
      'access-token',
    )
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);
}
