import { Role } from '../../../common/auth/role.enum';
import { Academy } from '../../academies/academy.entity';

export class LoginUserDto {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export class LoginResponseDto {
  /** Send as `Authorization: Bearer <accessToken>` */
  accessToken: string;
  user: LoginUserDto;
  academy: Academy;
}

export class MeDto {
  userId: string;
  academyId: string;
  email: string;
  role: Role;
  fullName: string;
  /** Linked coach profile, if the user is a coach */
  coachId: string | null;
  /** Linked athlete profile, if the user is an athlete */
  athleteId: string | null;
}

export class MemberDto {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
  /** false means the user can no longer sign in to this academy */
  isActive: boolean;
  coachId: string | null;
  athleteId: string | null;
}
