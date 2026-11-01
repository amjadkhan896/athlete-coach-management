import { Column, Entity } from 'typeorm';
import { VersionedTenantEntity } from '../../../common/persistence/base.entity';

export enum SessionStatus {
  Scheduled = 'scheduled',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

@Entity('training_sessions')
export class TrainingSession extends VersionedTenantEntity {
  @Column('uuid')
  teamId: string;

  @Column('uuid', { nullable: true })
  leadCoachId: string | null;

  @Column()
  title: string;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'varchar', nullable: true })
  location: string | null;

  @Column({ type: 'enum', enum: SessionStatus, enumName: 'session_status', default: SessionStatus.Scheduled })
  status: SessionStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
