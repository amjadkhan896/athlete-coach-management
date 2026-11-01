import { DataSource, EntityManager } from 'typeorm';

export interface TenantScope {
  academyId?: string | null;
  userId?: string | null;
}

/**
 * Runs work in a transaction with the tenant scope bound via transaction-local
 * settings. PostgreSQL RLS policies read these settings, so every query issued
 * through `manager` is limited to the academy, even if a WHERE clause is forgotten.
 * The settings are reset at COMMIT/ROLLBACK, so pooled connections never leak scope.
 */
export function withTenantTransaction<T>(
  dataSource: DataSource,
  scope: TenantScope,
  work: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  return dataSource.transaction(async (manager) => {
    await manager.query(
      `SELECT set_config('app.academy_id', $1, true), set_config('app.user_id', $2, true)`,
      [scope.academyId ?? '', scope.userId ?? ''],
    );
    return work(manager);
  });
}
