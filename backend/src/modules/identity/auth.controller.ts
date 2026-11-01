import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/auth/decorators';
import { ApiAuthenticated, ApiRateLimited, ErrorResponse } from '../../common/http/swagger';
import { TenantContext } from '../../common/tenancy/tenant-context';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterAcademyDto } from './dto/register.dto';
import { LoginResponseDto, MeDto } from './dto/responses.dto';

/** Brute-force protection for credential endpoints. Tests raise it via LOGIN_RATE_LIMIT. */
const credentialThrottle = { default: { limit: () => Number(process.env.LOGIN_RATE_LIMIT ?? 5), ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tenant: TenantContext,
  ) {}

  /**
   * Sign in and get an access token
   *
   * Returns a JWT for the user's academy. If the user belongs to several academies, pass `academyId`.
   */
  @Public()
  @Throttle(credentialThrottle)
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponse, description: 'Wrong email or password, or no active membership' })
  @ApiRateLimited()
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /**
   * Sign up a new academy
   *
   * Creates the academy with the caller as its administrator, and signs them in (same response as login).
   * The email must not already have an account. Can be disabled with ALLOW_ACADEMY_SIGNUP=false.
   */
  @Public()
  @Throttle(credentialThrottle)
  @Post('register')
  @ApiCreatedResponse({ type: LoginResponseDto })
  @ApiConflictResponse({ type: ErrorResponse, description: 'An account with this email already exists' })
  @ApiForbiddenResponse({ type: ErrorResponse, description: 'Sign-up is disabled on this server' })
  @ApiRateLimited()
  register(@Body() dto: RegisterAcademyDto) {
    return this.auth.register(dto);
  }

  /** The signed-in user, their role and linked coach/athlete profile */
  @ApiAuthenticated()
  @Get('me')
  @ApiOkResponse({ type: MeDto })
  async me() {
    const user = this.tenant.user;
    // Profile links let the UI show "my teams" / "my assessments" without extra lookups.
    const [profile] = await this.tenant.manager.query(
      `SELECT u.full_name AS "fullName",
              (SELECT id FROM coaches WHERE user_id = u.id) AS "coachId",
              (SELECT id FROM athletes WHERE user_id = u.id) AS "athleteId"
         FROM users u WHERE u.id = $1`,
      [user.userId],
    );
    return { ...user, ...profile };
  }

  /** Change your own password (requires the current password) */
  @ApiAuthenticated()
  @Throttle(credentialThrottle)
  @Post('change-password')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Password changed' })
  @ApiRateLimited()
  async changePassword(@Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(this.tenant.manager, this.tenant.user.email, dto.currentPassword, dto.newPassword);
  }
}
