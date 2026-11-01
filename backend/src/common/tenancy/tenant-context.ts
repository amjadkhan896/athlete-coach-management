import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { EntityManager, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { AuthUser } from '../auth/auth-user';
import { Role } from '../auth/role.enum';

/** Keys for request-local state held in CLS (AsyncLocalStorage). */
export const CLS_USER = 'user';
export const CLS_MANAGER = 'manager';

/** Request-scoped access to the current user and their tenant-bound transaction. */
@Injectable()
export class TenantContext {
  constructor(private readonly cls: ClsService) {}

  get user(): AuthUser {
    const user = this.cls.get<AuthUser | undefined>(CLS_USER);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  get academyId(): string {
    return this.user.academyId;
  }

  get isAdmin(): boolean {
    return this.user.role === Role.AcademyAdmin;
  }

  get manager(): EntityManager {
    const manager = this.cls.get<EntityManager | undefined>(CLS_MANAGER);
    if (!manager) {
      throw new Error('No tenant transaction is active; is TenantTransactionInterceptor registered?');
    }
    return manager;
  }

  /**
   * For athlete users: throws unless `athleteId` is their own profile.
   * Staff (admins, coaches) pass through.
   */
  async assertOwnAthleteIfAthlete(athleteId: string): Promise<void> {
    if (this.user.role !== Role.Athlete) return;
    const [own] = await this.manager.query('SELECT id FROM athletes WHERE user_id = $1', [this.user.userId]);
    if (own?.id !== athleteId) throw new ForbiddenException('Athletes can only view their own records');
  }

  repo<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
    return this.manager.getRepository(entity);
  }
}
