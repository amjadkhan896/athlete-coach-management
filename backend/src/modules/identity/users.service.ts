import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { Role } from '../../common/auth/role.enum';
import { TenantContext } from '../../common/tenancy/tenant-context';
import { CreateUserDto, UpdateMembershipDto } from './dto/user.dto';

export interface Member {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  coachId: string | null;
  athleteId: string | null;
}

const MEMBER_SELECT = `
  SELECT u.id AS "userId", u.email, u.full_name AS "fullName", m.role, m.is_active AS "isActive",
         c.id AS "coachId", a.id AS "athleteId"
    FROM academy_memberships m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN coaches c ON c.user_id = u.id AND c.academy_id = m.academy_id
    LEFT JOIN athletes a ON a.user_id = u.id AND a.academy_id = m.academy_id
   WHERE m.academy_id = app_current_academy()`;

/** Logins and roles within the current academy. */
@Injectable()
export class UsersService {
  constructor(private readonly tenant: TenantContext) {}

  list(): Promise<Member[]> {
    return this.tenant.manager.query(`${MEMBER_SELECT} ORDER BY m.role, u.full_name`);
  }

  async get(userId: string): Promise<Member> {
    const [member] = await this.tenant.manager.query(`${MEMBER_SELECT} AND u.id = $1`, [userId]);
    if (!member) throw new NotFoundException('User not found in this academy');
    return member;
  }

  async create(dto: CreateUserDto): Promise<Member> {
    if (dto.coachId && dto.role !== Role.Coach) throw new BadRequestException('coachId requires role coach');
    if (dto.athleteId && dto.role !== Role.Athlete) throw new BadRequestException('athleteId requires role athlete');

    const m = this.tenant.manager;
    const [{ id }] = await m.query(
      'SELECT create_academy_user($1, $2, $3, $4::membership_role) AS id',
      [dto.email, dto.fullName, await hash(dto.password, 12), dto.role],
    );

    // Link the login to its profile. RLS limits these updates to this academy.
    const link = async (table: 'coaches' | 'athletes', profileId: string) => {
      const res = await m.query(
        `UPDATE ${table} SET user_id = $1, updated_at = now(), version = version + 1
          WHERE id = $2 AND user_id IS NULL RETURNING id`,
        [id, profileId],
      );
      if (res[0].length === 0) throw new BadRequestException('Profile not found or already has a login');
    };
    if (dto.coachId) await link('coaches', dto.coachId);
    if (dto.athleteId) await link('athletes', dto.athleteId);

    return this.get(id);
  }

  async update(userId: string, dto: UpdateMembershipDto): Promise<Member> {
    if (userId === this.tenant.user.userId) {
      throw new ForbiddenException('You cannot change your own role or access');
    }
    const sets: string[] = [];
    const params: unknown[] = [userId];
    if (dto.role !== undefined) sets.push(`role = $${params.push(dto.role)}::membership_role`);
    if (dto.isActive !== undefined) sets.push(`is_active = $${params.push(dto.isActive)}`);
    if (sets.length) {
      await this.tenant.manager.query(
        `UPDATE academy_memberships SET ${sets.join(', ')} WHERE user_id = $1 AND academy_id = app_current_academy()`,
        params,
      );
    }
    return this.get(userId);
  }
}
