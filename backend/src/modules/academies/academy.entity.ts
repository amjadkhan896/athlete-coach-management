import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('academies')
export class Academy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({ default: 'Asia/Dubai' })
  timezone: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
