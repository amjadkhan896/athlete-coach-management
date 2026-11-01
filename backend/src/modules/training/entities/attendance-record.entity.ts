import { Column, Entity } from 'typeorm';
import { VersionedTenantEntity } from '../../../common/persistence/base.entity';

export enum AttendanceStatus {
  Present = 'present',
  Absent = 'absent',
  Late = 'late',
  Excused = 'excused',
}

/** One row per (session, athlete); re-submitting updates it rather than duplicating. */
@Entity('attendance_records')
export class AttendanceRecord extends VersionedTenantEntity {
  @Column('uuid')
  sessionId: string;

  @Column('uuid')
  athleteId: string;

  @Column({ type: 'enum', enum: AttendanceStatus, enumName: 'attendance_status' })
  status: AttendanceStatus;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @Column('uuid')
  recordedBy: string;
}
