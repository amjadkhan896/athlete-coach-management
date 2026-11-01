import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiHeader, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { hash } from 'bcryptjs';
import { DataSource } from 'typeorm';
import { Public } from '../../common/auth/decorators';
import { ApiConflict, ErrorResponse } from '../../common/http/swagger';
import { AcademySummaryDto, CreatedAcademyDto } from './platform-responses.dto';
import { CreateAcademyDto } from './platform.dto';
import { PlatformKeyGuard } from './platform-key.guard';

/**
 * Platform operator endpoints: onboard a new academy with its first admin.
 * These run outside any academy, through SECURITY DEFINER functions.
 */
@ApiTags('platform')
@ApiHeader({ name: 'X-Platform-Key', required: true, description: 'Value of PLATFORM_ADMIN_KEY' })
@ApiUnauthorizedResponse({ type: ErrorResponse, description: 'Missing or wrong platform key' })
@ApiNotFoundResponse({ type: ErrorResponse, description: 'Platform endpoints are disabled (no PLATFORM_ADMIN_KEY configured)' })
@Public()
@UseGuards(PlatformKeyGuard)
@Controller('platform/academies')
export class PlatformController {
  constructor(private readonly dataSource: DataSource) {}

  /** List all academies with headline counts */
  @Get()
  @ApiOkResponse({ type: [AcademySummaryDto] })
  list() {
    return this.dataSource.query('SELECT * FROM platform_list_academies()');
  }

  /** Onboard a new academy with its first admin (an existing account with that email is reused) */
  @Post()
  @ApiCreatedResponse({ type: CreatedAcademyDto })
  @ApiConflict('The slug is already taken')
  async create(@Body() dto: CreateAcademyDto) {
    const [{ id }] = await this.dataSource.query(
      'SELECT platform_create_academy($1, $2, $3, $4, $5, $6) AS id',
      [dto.name, dto.slug, dto.timezone ?? 'Asia/Dubai', dto.adminEmail, dto.adminName, await hash(dto.adminPassword, 12)],
    );
    return { id, name: dto.name, slug: dto.slug, adminEmail: dto.adminEmail };
  }
}
