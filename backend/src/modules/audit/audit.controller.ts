import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Roles } from '../../common/auth/decorators';
import { Role } from '../../common/auth/role.enum';
import { ApiAuthenticated } from '../../common/http/swagger';
import { TenantContext } from '../../common/tenancy/tenant-context';
import { AuditEntryDto } from './audit.dto';

const ENTITIES = [
  'academy_memberships',
  'athletes',
  'coaches',
  'teams',
  'athlete_team_assignments',
  'coach_team_assignments',
  'training_sessions',
  'attendance_records',
  'performance_assessments',
] as const;

export class AuditQuery {
  @ApiPropertyOptional({ enum: ENTITIES })
  @IsOptional() @IsIn(ENTITIES)
  entity?: (typeof ENTITIES)[number];

  @IsOptional() @IsUUID()
  entityId?: string;

  @IsOptional() @IsUUID()
  changedBy?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  limit = 50;
}

/** Who changed what, and when. Written only by database triggers; read-only here. */
@ApiTags('audit')
@ApiAuthenticated()
@Roles(Role.AcademyAdmin)
@Controller('audit')
export class AuditController {
  constructor(private readonly tenant: TenantContext) {}

  /** Change history: who changed what and when, with values before and after */
  @Get()
  @ApiOkResponse({ type: [AuditEntryDto] })
  list(@Query() query: AuditQuery) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (query.entity) where.push(`l.table_name = $${params.push(query.entity)}`);
    if (query.entityId) where.push(`l.row_id = $${params.push(query.entityId)}`);
    if (query.changedBy) where.push(`l.changed_by = $${params.push(query.changedBy)}`);
    params.push(query.limit);

    return this.tenant.manager.query(
      `SELECT l.id, l.table_name AS "entity", l.row_id AS "entityId", l.action, l.changed_at AS "changedAt",
              l.changed_by AS "changedBy", u.full_name AS "changedByName", l.old_data AS "before", l.new_data AS "after"
         FROM audit_log l
         LEFT JOIN users u ON u.id = l.changed_by
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY l.changed_at DESC, l.id DESC
        LIMIT $${params.length}`,
      params,
    );
  }
}
