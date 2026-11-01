import { Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

export abstract class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  academyId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

/** Mutable records carry a version for optimistic concurrency control. */
export abstract class VersionedTenantEntity extends TenantEntity {
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
