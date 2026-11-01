import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { AttendanceStatus } from '../entities/attendance-record.entity';

export class AttendanceEntryDto {
  @IsUUID()
  athleteId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional() @IsString() @MaxLength(300)
  note?: string;
}

export class RecordAttendanceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}
