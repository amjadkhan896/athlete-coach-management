export class AcademySummaryDto {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  created_at: Date;
  athletes: number;
  coaches: number;
  /** Active logins */
  users: number;
}

export class CreatedAcademyDto {
  id: string;
  name: string;
  slug: string;
  adminEmail: string;
}
