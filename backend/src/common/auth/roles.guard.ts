import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { AuthUser } from './auth-user';
import { CLS_USER } from '../tenancy/tenant-context';
import { ROLES } from './decorators';
import { Role } from './role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;

    const user = this.cls.get<AuthUser | undefined>(CLS_USER);
    if (!user || !roles.includes(user.role)) throw new ForbiddenException();
    return true;
  }
}
