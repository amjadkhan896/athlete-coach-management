import { Column, Entity } from 'typeorm';
import { VersionedTenantEntity } from '../../common/persistence/base.entity';

export enum AthleteStatus {
  Active = 'active',
  Inactive = 'inactive',
  Archived = 'archived',
}

@Entity('athletes')
export class Athlete extends VersionedTenantEntity {
  @Column('uuid', { nullable: true })
  userId: string | null;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'date' })
  dateOfBirth: string;

  @Column({ type: 'varchar', nullable: true })
  gender: string | null;

  @Column({ type: 'enum', enum: AthleteStatus, enumName: 'athlete_status', default: AthleteStatus.Active })
  status: AthleteStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
