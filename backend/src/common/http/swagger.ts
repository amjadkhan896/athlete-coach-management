import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiProperty,
  ApiPropertyOptional,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

/** Error body returned by every endpoint. */
export class ErrorResponse {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }], example: 'This change overlaps an existing record' })
  message: string | string[];

  @ApiPropertyOptional({ description: 'Database constraint that rejected the change', example: 'athlete_team_no_overlap' })
  constraint?: string;

  @ApiPropertyOptional({ description: 'Current version, returned when an update was based on a stale version' })
  currentVersion?: number;
}

/** Responses shared by all authenticated endpoints. */
export const ApiAuthenticated = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ type: ErrorResponse, description: 'Missing, invalid or expired token, or access was removed' }),
    ApiForbiddenResponse({ type: ErrorResponse, description: 'Your role (or team assignment) does not allow this' }),
    ApiBadRequestResponse({ type: ErrorResponse, description: 'The request failed validation' }),
  );

export const ApiNotFound = (what = 'Record') =>
  ApiNotFoundResponse({ type: ErrorResponse, description: `${what} not found in your academy` });

/** For PATCH with optimistic locking. */
export const ApiVersionConflict = () =>
  ApiConflictResponse({ type: ErrorResponse, description: 'Someone else changed the record since you read it (send the latest version)' });

export const ApiConflict = (description: string) => ApiConflictResponse({ type: ErrorResponse, description });

export const ApiUnprocessable = (description: string) => ApiUnprocessableEntityResponse({ type: ErrorResponse, description });

export const ApiRateLimited = () => ApiTooManyRequestsResponse({ type: ErrorResponse, description: 'Too many attempts; wait a minute' });

const pageClasses = new Map<Type<unknown>, Type<unknown>>();

/** Swagger schema for `{ items: T[], total, page, limit }`. */
export function PageOf<T>(item: Type<T>): Type<unknown> {
  const cached = pageClasses.get(item);
  if (cached) return cached;

  class PageResponse {
    @ApiProperty({ type: [item] })
    items: T[];

    @ApiProperty({ description: 'Total matching records', example: 30 })
    total: number;

    @ApiProperty({ example: 1 })
    page: number;

    @ApiProperty({ example: 25 })
    limit: number;
  }
  Object.defineProperty(PageResponse, 'name', { value: `${item.name}Page` });
  pageClasses.set(item, PageResponse);
  return PageResponse;
}
