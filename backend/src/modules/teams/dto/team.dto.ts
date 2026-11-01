import { IntersectionType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationQuery } from '../../../common/http/pagination.dto';
import { VersionedDto } from '../../../common/http/version.dto';
import { TeamStatus } from '../entities/team.entity';

export class CreateTeamDto {
  @IsString() @MinLength(1) @MaxLength(100)
  name: string;

  @IsString() @MinLength(1) @MaxLength(50)
  sport: string;

  @IsOptional() @IsString() @MaxLength(20)
  ageGroup?: string;

  @IsOptional() @IsString() @MaxLength(20)
  season?: string;
}

export class UpdateTeamDto extends IntersectionType(PartialType(CreateTeamDto), VersionedDto) {
  @IsOptional() @IsEnum(TeamStatus)
  status?: TeamStatus;
}

export class ListTeamsQuery extends PaginationQuery {
  @IsOptional() @IsEnum(TeamStatus)
  status?: TeamStatus;
}
