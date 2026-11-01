import { AttendanceStatus } from '../entities/attendance-record.entity';

export class AttendanceHistoryEntryDto {
  id: string;
  status: AttendanceStatus;
  note: string | null;
  sessionId: string;
  title: string;
  startsAt: Date;
  teamId: string;
  teamName: string;
}

export class AttendanceSummaryRowDto {
  athleteId: string;
  name: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  /** (present + late) / sessions, as a whole percentage; null if there were no sessions */
  attendanceRate: number | null;
}

export class AttendanceSummaryDto {
  teamId: string;
  from: string;
  to: string;
  /** Non-cancelled sessions of the team in the period */
  sessions: number;
  athletes: AttendanceSummaryRowDto[];
}
