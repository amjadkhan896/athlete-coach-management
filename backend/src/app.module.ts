import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClsModule } from 'nestjs-cls';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { DatabaseExceptionFilter } from './common/http/database-exception.filter';
import { HealthController } from './common/http/health.controller';
import { TenancyModule } from './common/tenancy/tenancy.module';
import { TenantTransactionInterceptor } from './common/tenancy/tenant-transaction.interceptor';
import { AppEnv, validateEnv } from './config/env';
import { buildDataSourceOptions } from './database/typeorm-options';
import { AcademiesModule } from './modules/academies/academies.module';
import { AthletesModule } from './modules/athletes/athletes.module';
import { AuditModule } from './modules/audit/audit.module';
import { CoachesModule } from './modules/coaches/coaches.module';
import { IdentityModule } from './modules/identity/identity.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { PlatformModule } from './modules/platform/platform.module';
import { TeamsModule } from './modules/teams/teams.module';
import { TrainingModule } from './modules/training/training.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    TypeOrmModule.forRootAsync({
      // Runs after ConfigModule has loaded .env into process.env.
      useFactory: () => buildDataSourceOptions(validateEnv(), 'runtime'),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    TenancyModule,
    // Domain modules: each owns its entities and exposes services, never tables.
    IdentityModule,
    AcademiesModule,
    AthletesModule,
    CoachesModule,
    TeamsModule,
    TrainingModule,
    PerformanceModule,
    AuditModule,
    PlatformModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: rate limit, authenticate, authorize, then open the tenant transaction.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantTransactionInterceptor },
    { provide: APP_FILTER, useClass: DatabaseExceptionFilter },
  ],
})
export class AppModule {}
