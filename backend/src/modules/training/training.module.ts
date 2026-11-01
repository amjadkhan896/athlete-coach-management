import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [TeamsModule],
  controllers: [SessionsController, AttendanceController],
  providers: [SessionsService, AttendanceService],
})
export class TrainingModule {}
