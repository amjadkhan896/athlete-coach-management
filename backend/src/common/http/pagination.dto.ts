import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 25;

  get offset(): number {
    return (this.page - 1) * this.limit;
  }
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
