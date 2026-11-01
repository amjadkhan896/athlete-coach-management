import { Module } from '@nestjs/common';
import { CoachesModule } from '../coaches/coaches.module';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { TeamAccessService } from './team-access.service';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [CoachesModule],
  controllers: [TeamsController, AssignmentsController],
  providers: [TeamsService, AssignmentsService, TeamAccessService],
  // Other modules depend on the access policy, not on assignment tables.
  exports: [TeamAccessService],
})
export class TeamsModule {}
