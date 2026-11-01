import { ConflictException, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { VersionedTenantEntity } from './base.entity';

/**
 * Compare-and-set update: succeeds only if the row still has the version the
 * client read. A lost update becomes a 409 the client can resolve by re-reading.
 */
export async function updateWithVersion<T extends VersionedTenantEntity>(
  repo: Repository<T>,
  id: string,
  expectedVersion: number,
  changes: QueryDeepPartialEntity<T>,
): Promise<T> {
  const where = { id } as FindOptionsWhere<T>;
  const result = await repo
    .createQueryBuilder()
    .update()
    .set(changes)
    .where('id = :id AND version = :version', { id, version: expectedVersion })
    .execute();

  if (!result.affected) {
    const current = await repo.findOneBy(where);
    if (!current) throw new NotFoundException();
    throw new ConflictException({
      statusCode: 409,
      message: 'This record was changed by someone else. Reload and try again.',
      currentVersion: current.version,
    });
  }
  return repo.findOneByOrFail(where);
}
