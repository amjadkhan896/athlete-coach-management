import { Column, Entity } from 'typeorm';
import { VersionedTenantEntity } from '../../common/persistence/base.entity';

export enum CoachStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@Entity('coaches')
export class Coach extends VersionedTenantEntity {
  /** Login account, if the coach signs in to record sessions. */
  @Column('uuid', { nullable: true })
  userId: string | null;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'varchar', nullable: true })
  specialization: string | null;

  @Column({ type: 'enum', enum: CoachStatus, enumName: 'coach_status', default: CoachStatus.Active })
  status: CoachStatus;
}
