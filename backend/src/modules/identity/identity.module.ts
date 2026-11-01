import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [AuthController, UsersController],
  providers: [AuthService, UsersService],
})
export class IdentityModule {}
