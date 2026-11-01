import { Column, Entity } from 'typeorm';
import { TenantEntity } from '../../common/persistence/base.entity';

/**
 * Append-only. A correction is a new row pointing at the one it replaces
 * (supersedes_id), so the original assessment is never lost.
 */
@Entity('performance_assessments')
export class PerformanceAssessment extends TenantEntity {
  @Column('uuid')
  athleteId: string;

  @Column('uuid', { nullable: true })
  sessionId: string | null;

  @Column({ type: 'date' })
  assessedOn: string;

  @Column()
  category: string;

  /** Sport-specific measurements, e.g. { "sprint_40m_s": 5.4, "vertical_jump_cm": 52 }. */
  @Column({ type: 'jsonb', default: {} })
  metrics: Record<string, number | string>;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true })
  overallScore: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column('uuid', { nullable: true })
  supersedesId: string | null;

  @Column('uuid')
  assessedBy: string;
}
