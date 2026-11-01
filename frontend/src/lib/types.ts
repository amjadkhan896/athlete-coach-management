export type Role = "academy_admin" | "coach" | "athlete";

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Academy {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}

export interface CurrentUser {
  userId: string;
  academyId: string;
  role: Role;
  email: string;
  fullName: string;
  coachId: string | null;
  athleteId: string | null;
}

export interface Athlete {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string | null;
  status: "active" | "inactive" | "archived";
  notes: string | null;
  version: number;
}

export interface Coach {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  specialization: string | null;
  status: "active" | "inactive";
  version: number;
}

export interface Team {
  id: string;
  name: string;
  sport: string;
  ageGroup: string | null;
  season: string | null;
  status: "active" | "archived";
  version: number;
}

export interface TrainingSession {
  id: string;
  teamId: string;
  leadCoachId: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  status: "scheduled" | "completed" | "cancelled";
  notes: string | null;
  version: number;
}

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  athleteId: string;
  status: AttendanceStatus;
  note: string | null;
}

export interface AttendanceHistoryEntry {
  id: string;
  status: AttendanceStatus;
  note: string | null;
  sessionId: string;
  title: string;
  startsAt: string;
  teamName: string;
}

export interface Assessment {
  id: string;
  athleteId: string;
  sessionId: string | null;
  assessedOn: string;
  category: string;
  metrics: Record<string, number | string>;
  overallScore: string | null;
  notes: string | null;
  supersedesId: string | null;
  createdAt: string;
  athleteName?: string | null;
}

export interface RosterMember {
  assignmentId: string;
  id: string;
  firstName: string;
  lastName: string;
  validFrom: string;
  role?: "head" | "assistant";
}

export interface Roster {
  teamId: string;
  date: string;
  athletes: RosterMember[];
  coaches: RosterMember[];
}

export interface TeamHistoryEntry {
  id: string;
  teamId: string;
  teamName: string;
  role?: "head" | "assistant";
  validFrom: string;
  validTo: string | null;
  reason: string | null;
}

export interface Member {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  coachId: string | null;
  athleteId: string | null;
}
