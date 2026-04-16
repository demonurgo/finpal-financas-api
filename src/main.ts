import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';
import { validateRuntimeEnvironment } from './config/runtime-env';

async function bootstrap(): Promise<void> {
  validateRuntimeEnvironment();

  const app = await NestFactory.create(AppModule);

  configureApp(app);
  setupSwagger(app);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`API do Finpal rodando na porta ${port}`);
}

void bootstrap();
