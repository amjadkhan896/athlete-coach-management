export class AuditEntryDto {
  id: string;
  /** Table that changed, e.g. athletes */
  entity: string;
  entityId: string;
  action: 'insert' | 'update';
  changedAt: Date;
  /** User who made the change; null for system changes such as the demo seed */
  changedBy: string | null;
  changedByName: string | null;
  /** Row values before the change (updates only) */
  before: Record<string, unknown> | null;
  /** Row values after the change */
  after: Record<string, unknown>;
}
