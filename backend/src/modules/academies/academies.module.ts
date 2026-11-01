import { Module } from '@nestjs/common';
import { AcademiesController } from './academies.controller';

@Module({ controllers: [AcademiesController] })
export class AcademiesModule {}
