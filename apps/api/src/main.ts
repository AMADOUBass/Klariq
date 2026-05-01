import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import pino from 'pino';
import { AppModule } from './app.module';
import { env } from './env';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

const logger = pino({
  name: 'klariq-api',
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  app.enableCors({
    origin: env.WEB_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api', { exclude: ['health', 'docs'] });

  // ─── Modern API Documentation (Scalar) ───
  const config = new DocumentBuilder()
    .setTitle('Klariq Engine API')
    .setDescription('The core financial engine for Klariq Accounting.')
    .setVersion('1.0')
    .addTag('Accounting', 'Ledger and chart of accounts')
    .addTag('Invoicing', 'Sales and accounts receivable')
    .addTag('Audit', 'Compliance and activity tracking')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  app.use(
    '/docs',
    apiReference({
      spec: {
        content: document,
      },
      theme: 'purple',
      layout: 'modern',
      darkMode: true,
    }),
  );

  await app.listen(env.PORT);
  logger.info({ port: env.PORT, env: env.NODE_ENV, docs: `http://localhost:${env.PORT}/docs` }, 'Klariq API is running');
}

bootstrap().catch((error: unknown) => {
  logger.error({ error }, 'Fatal bootstrap error — shutting down');
  process.exit(1);
});
