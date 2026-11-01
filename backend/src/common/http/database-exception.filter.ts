import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';

interface PgError {
  code?: string;
  constraint?: string;
  detail?: string;
}

const PG_STATUS: Record<string, { status: HttpStatus; message: string }> = {
  '23505': { status: HttpStatus.CONFLICT, message: 'A record with these values already exists' },
  '23P01': { status: HttpStatus.CONFLICT, message: 'This change overlaps an existing record' },
  '23503': { status: HttpStatus.UNPROCESSABLE_ENTITY, message: 'A referenced record does not exist' },
  '23514': { status: HttpStatus.UNPROCESSABLE_ENTITY, message: 'The values violate a data rule' },
  '40001': { status: HttpStatus.CONFLICT, message: 'Concurrent update detected, please retry' },
  '40P01': { status: HttpStatus.CONFLICT, message: 'Concurrent update detected, please retry' },
  '42501': { status: HttpStatus.FORBIDDEN, message: 'Not permitted' },
};

/** Turns constraint violations into client errors instead of 500s. */
@Catch(QueryFailedError, EntityNotFoundError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: QueryFailedError | EntityNotFoundError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof EntityNotFoundError) {
      response.status(HttpStatus.NOT_FOUND).json({ statusCode: 404, message: 'Not found' });
      return;
    }

    const pg = exception.driverError as PgError;
    const mapped = pg.code ? PG_STATUS[pg.code] : undefined;
    if (!mapped) {
      this.logger.error(exception.message, exception.stack);
      response.status(500).json({ statusCode: 500, message: 'Internal server error' });
      return;
    }
    response.status(mapped.status).json({
      statusCode: mapped.status,
      message: mapped.message,
      constraint: pg.constraint,
    });
  }
}
