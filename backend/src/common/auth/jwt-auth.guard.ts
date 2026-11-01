import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ClsService } from 'nestjs-cls';
import { DataSource } from 'typeorm';
import { CLS_USER } from '../tenancy/tenant-context';
import { withTenantTransaction } from '../tenancy/tenant-transaction';
import { AuthUser, JwtPayload } from './auth-user';
import { IS_PUBLIC } from './decorators';
import { Role } from './role.enum';

/**
 * Verifies the bearer token, then re-reads the membership so that revoked
 * access or a changed role takes effect immediately rather than at token expiry.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly dataSource: DataSource,
    private readonly cls: ClsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    const scope = { academyId: payload.academyId, userId: payload.sub };
    const rows = await withTenantTransaction(this.dataSource, scope, (manager) =>
      manager.query(
        `SELECT m.role FROM academy_memberships m
           JOIN users u ON u.id = m.user_id
          WHERE m.user_id = $1 AND m.academy_id = $2 AND m.is_active AND u.is_active`,
        [payload.sub, payload.academyId],
      ),
    );
    if (rows.length === 0) throw new UnauthorizedException('Membership is not active');

    this.cls.set<AuthUser>(CLS_USER, {
      userId: payload.sub,
      academyId: payload.academyId,
      email: payload.email,
      role: rows[0].role as Role,
    });
    return true;
  }
}
