import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../../../common/auth/role.enum';

@Entity('academy_memberships')
export class AcademyMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  academyId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: Role, enumName: 'membership_role' })
  role: Role;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
