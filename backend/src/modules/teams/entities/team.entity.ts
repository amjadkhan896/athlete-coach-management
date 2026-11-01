import { Column, Entity } from 'typeorm';
import { VersionedTenantEntity } from '../../../common/persistence/base.entity';

export enum TeamStatus {
  Active = 'active',
  Archived = 'archived',
}

@Entity('teams')
export class Team extends VersionedTenantEntity {
  @Column()
  name: string;

  @Column()
  sport: string;

  @Column({ type: 'varchar', nullable: true })
  ageGroup: string | null;

  @Column({ type: 'varchar', nullable: true })
  season: string | null;

  @Column({ type: 'enum', enum: TeamStatus, enumName: 'team_status', default: TeamStatus.Active })
  status: TeamStatus;
}
