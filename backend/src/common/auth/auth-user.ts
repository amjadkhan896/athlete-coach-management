import { Role } from './role.enum';

/** Identity resolved from a verified token and an active academy membership. */
export interface AuthUser {
  userId: string;
  academyId: string;
  role: Role;
  email: string;
}

export interface JwtPayload {
  sub: string;
  academyId: string;
  email: string;
}
