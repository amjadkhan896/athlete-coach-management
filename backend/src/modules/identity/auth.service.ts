import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { EntityManager } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { compare, hash, hashSync } from 'bcryptjs';
import { DataSource } from 'typeorm';
import { JwtPayload } from '../../common/auth/auth-user';
import { withTenantTransaction } from '../../common/tenancy/tenant-transaction';
import { Academy } from '../academies/academy.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterAcademyDto } from './dto/register.dto';
import { AcademyMembership } from './entities/academy-membership.entity';

// Compared against when the email is unknown so response time doesn't reveal which accounts exist.
const DUMMY_HASH = hashSync('not-a-real-password', 12);

interface UserLookup {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  is_active: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Self-service sign-up: creates an academy with the caller as its admin and
   * signs them in. The email must be new; existing users sign in instead.
   */
  async register(dto: RegisterAcademyDto) {
    if (!this.config.get<boolean>('ALLOW_ACADEMY_SIGNUP')) {
      throw new ForbiddenException('Academy sign-up is disabled on this server');
    }
    const [existing] = await this.dataSource.query('SELECT id FROM auth_lookup_user($1)', [dto.email]);
    if (existing) {
      throw new ConflictException('An account with this email already exists. Sign in instead.');
    }

    // The slug only needs to be unique; a short random suffix avoids collisions between similar names.
    const base = dto.academyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'academy';
    const slug = `${base}-${randomBytes(3).toString('hex')}`;

    // A concurrent sign-up with the same email fails here on the unique index (409), never reusing an account.
    const [created] = await this.dataSource.query('SELECT * FROM register_academy($1, $2, $3, $4, $5, $6)', [
      dto.academyName.trim(),
      slug,
      dto.timezone ?? 'Asia/Dubai',
      dto.email.trim(),
      dto.fullName.trim(),
      await hash(dto.password, 12),
    ]);
    return this.login({ email: dto.email, password: dto.password, academyId: created.academy_id });
  }

  async login(dto: LoginDto) {
    // users is RLS-protected; this SECURITY DEFINER function is the only pre-auth lookup path.
    const [user]: UserLookup[] = await this.dataSource.query('SELECT * FROM auth_lookup_user($1)', [
      dto.email,
    ]);

    const valid = await compare(dto.password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !valid || !user.is_active) throw new UnauthorizedException('Invalid credentials');

    // Memberships are RLS-protected; scope by user so only this user's rows are visible.
    const memberships = await withTenantTransaction(this.dataSource, { userId: user.id }, (manager) =>
      manager
        .getRepository(AcademyMembership)
        .createQueryBuilder('m')
        .innerJoinAndMapOne('m.academy', Academy, 'a', 'a.id = m.academyId')
        .where('m.userId = :userId AND m.isActive', { userId: user.id })
        .getMany(),
    );

    const membership = dto.academyId
      ? memberships.find((m) => m.academyId === dto.academyId)
      : memberships.length === 1
        ? memberships[0]
        : undefined;

    if (!membership) {
      if (memberships.length > 1 && !dto.academyId) {
        throw new BadRequestException({
          message: 'Select an academy',
          academies: memberships.map((m) => (m as AcademyMembership & { academy: Academy }).academy),
        });
      }
      throw new UnauthorizedException('No active academy membership');
    }

    const payload: JwtPayload = { sub: user.id, academyId: membership.academyId, email: user.email };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: { id: user.id, email: user.email, fullName: user.full_name, role: membership.role },
      academy: (membership as AcademyMembership & { academy: Academy }).academy,
    };
  }

  /** Changes the signed-in user's password after checking the current one. */
  async changePassword(manager: EntityManager, email: string, currentPassword: string, newPassword: string) {
    const [user]: UserLookup[] = await manager.query('SELECT * FROM auth_lookup_user($1)', [email]);
    if (!user || !(await compare(currentPassword, user.password_hash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    await manager.query('SELECT set_own_password($1)', [await hash(newPassword, 12)]);
  }
}
