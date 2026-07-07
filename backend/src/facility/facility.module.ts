import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { FacilityController } from './facility.controller';
import { FacilityService } from './facility.service';

@Module({
  imports: [ProjectsModule],
  controllers: [FacilityController],
  providers: [FacilityService],
  exports: [FacilityService],
})
export class FacilityModule {}