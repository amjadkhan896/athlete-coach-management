import { Column, Entity } from 'typeorm';
import { TenantEntity } from '../../../common/persistence/base.entity';

/**
 * Effective-dated membership of an athlete in a team. Rows are never deleted or
 * rewritten: a move closes the open row (valid_to) and inserts a new one, so the
 * full history remains queryable. Ranges are half-open: [valid_from, valid_to).
 */
@Entity('athlete_team_assignments')
export class AthleteTeamAssignment extends TenantEntity {
  @Column('uuid')
  athleteId: string;

  @Column('uuid')
  teamId: string;

  @Column({ type: 'date' })
  validFrom: string;

  @Column({ type: 'date', nullable: true })
  validTo: string | null;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @Column('uuid')
  createdBy: string;
}
