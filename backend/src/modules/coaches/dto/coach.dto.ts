import { IntersectionType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PaginationQuery } from '../../../common/http/pagination.dto';
import { VersionedDto } from '../../../common/http/version.dto';
import { CoachStatus } from '../coach.entity';

export class CreateCoachDto {
  @IsString() @MinLength(1) @MaxLength(100)
  firstName: string;

  @IsString() @MinLength(1) @MaxLength(100)
  lastName: string;

  @IsOptional() @IsString() @MaxLength(100)
  specialization?: string;

  @IsOptional() @IsUUID()
  userId?: string;
}

export class UpdateCoachDto extends IntersectionType(PartialType(CreateCoachDto), VersionedDto) {
  @IsOptional() @IsEnum(CoachStatus)
  status?: CoachStatus;
}

export class ListCoachesQuery extends PaginationQuery {
  @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @IsOptional() @IsEnum(CoachStatus)
  status?: CoachStatus;
}
