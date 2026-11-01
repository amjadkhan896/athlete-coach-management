import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validateEnv } from './config/env';

/**
 * Controller doc comments become operation summaries. A comment's first line is
 * the summary; any following paragraphs become the operation description.
 */
function withSplitSummaries(document: OpenAPIObject): OpenAPIObject {
  for (const path of Object.values(document.paths)) {
    for (const operation of Object.values(path) as { summary?: string; description?: string }[]) {
      const [summary, ...rest] = operation.summary?.split(/\n\s*\n/) ?? [];
      if (rest.length) {
        operation.summary = summary.trim();
        operation.description = rest.join('\n\n').trim();
      }
    }
  }
  return document;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const env = validateEnv();

  app.setGlobalPrefix('api', { exclude: ['health/live', 'health/ready'] });
  app.enableCors({ origin: env.CORS_ORIGIN.split(','), credentials: true });
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Athlete & Coach Management API')
      .setVersion('1.0.0')
      .setDescription(
        [
          'REST API for sports academies: athletes, coaches, teams, training sessions, attendance and performance assessments.',
          '',
          '**Authentication:** call `POST /api/auth/login`, then click *Authorize* and paste the `accessToken`.',
          'Every request is limited to the academy in the token.',
          '',
          '**Roles:** `academy_admin` (everything in the academy), `coach` (their teams), `athlete` (their own records).',
          '',
          '**Concurrency:** `PATCH` requests must include the `version` you last read; a stale version returns `409 Conflict`.',
          '',
          '**Demo login:** `admin@falcons.test` / `ChangeMe123!` (after seeding).',
        ].join('\n'),
      )
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, () => withSplitSummaries(SwaggerModule.createDocument(app, config)), {
      swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha', operationsSorter: 'method' },
    });
  }

  await app.listen(env.PORT, '0.0.0.0');
  Logger.log(`API listening on :${env.PORT}`, 'Bootstrap');
}
void bootstrap();
