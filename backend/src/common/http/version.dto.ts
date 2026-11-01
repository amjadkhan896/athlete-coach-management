import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class VersionedDto {
  @ApiProperty({ description: 'Version the client last read; required for optimistic locking' })
  @IsInt()
  @Min(1)
  version: number;
}
