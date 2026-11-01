import { Column, Entity } from 'typeorm';
import { TenantEntity } from '../../../common/persistence/base.entity';

export enum CoachTeamRole {
  Head = 'head',
  Assistant = 'assistant',
}

/** Effective-dated coach/team assignment; same history rules as athlete assignments. */
@Entity('coach_team_assignments')
export class CoachTeamAssignment extends TenantEntity {
  @Column('uuid')
  coachId: string;

  @Column('uuid')
  teamId: string;

  @Column({ type: 'enum', enum: CoachTeamRole, enumName: 'coach_team_role', default: CoachTeamRole.Assistant })
  role: CoachTeamRole;

  @Column({ type: 'date' })
  validFrom: string;

  @Column({ type: 'date', nullable: true })
  validTo: string | null;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @Column('uuid')
  createdBy: string;
}
