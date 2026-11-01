import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { from, lastValueFrom, Observable } from 'rxjs';
import { DataSource } from 'typeorm';
import { AuthUser } from '../auth/auth-user';
import { CLS_MANAGER, CLS_USER } from './tenant-context';
import { withTenantTransaction } from './tenant-transaction';

/**
 * Wraps each authenticated request in one tenant-scoped transaction, so a
 * request either fully succeeds or leaves no partial writes behind.
 */
@Injectable()
export class TenantTransactionInterceptor implements NestInterceptor {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cls: ClsService,
  ) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const user = this.cls.get<AuthUser | undefined>(CLS_USER);
    if (!user) return next.handle();

    return from(
      withTenantTransaction(this.dataSource, user, (manager) => {
        this.cls.set(CLS_MANAGER, manager);
        return lastValueFrom(next.handle(), { defaultValue: undefined });
      }),
    );
  }
}
