import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformKeyGuard } from './platform-key.guard';

@Module({
  controllers: [PlatformController],
  providers: [PlatformKeyGuard],
})
export class PlatformModule {}
