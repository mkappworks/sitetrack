import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import pino from 'pino';

async function bootstrap() {
  // Structured JSON logger — stdout in containers, pretty in dev
  const logger = pino({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  });

  const app = await NestFactory.create(AppModule, {
    // Replace NestJS default logger with pino
    logger: {
      log: (msg) => logger.info(msg),
      error: (msg, trace) => logger.error({ trace }, msg),
      warn: (msg) => logger.warn(msg),
      debug: (msg) => logger.debug(msg),
      verbose: (msg) => logger.trace(msg),
    },
  });

  const config = app.get(ConfigService);

  // Validate all incoming DTOs globally — fail fast at the boundary
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // Strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,        // Auto-transform payloads to DTO instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS — tightly scoped to the Next.js frontend origin
  const corsOrigins = config.get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const port = config.get<number>('PORT', 3001);
  await app.listen(port);
  logger.info({ port }, 'SiteTrack API listening');
}

bootstrap();
