import { ApiPropertyOptional, IntersectionType, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PaginationQuery } from '../../../common/http/pagination.dto';
import { VersionedDto } from '../../../common/http/version.dto';
import { AthleteStatus } from '../athlete.entity';

export class CreateAthleteDto {
  @IsString() @MinLength(1) @MaxLength(100)
  firstName: string;

  @IsString() @MinLength(1) @MaxLength(100)
  lastName: string;

  @IsDateString({ strict: true })
  dateOfBirth: string;

  @IsOptional() @IsString() @MaxLength(30)
  gender?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}

export class UpdateAthleteDto extends IntersectionType(PartialType(CreateAthleteDto), VersionedDto) {
  @IsOptional() @IsEnum(AthleteStatus)
  status?: AthleteStatus;
}

export class ListAthletesQuery extends PaginationQuery {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: AthleteStatus }) @IsOptional() @IsEnum(AthleteStatus)
  status?: AthleteStatus;

  @ApiPropertyOptional({ description: 'Only athletes currently assigned to this team' })
  @IsOptional() @IsUUID()
  teamId?: string;
}
