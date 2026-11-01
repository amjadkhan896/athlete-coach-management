import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

/**
 * Protects platform-operator routes with a shared secret in the X-Platform-Key
 * header. When PLATFORM_ADMIN_KEY is not configured the routes do not exist.
 */
@Injectable()
export class PlatformKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('PLATFORM_ADMIN_KEY');
    if (!expected) throw new NotFoundException();

    const given = context.switchToHttp().getRequest<Request>().header('x-platform-key') ?? '';
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException();
    return true;
  }
}
