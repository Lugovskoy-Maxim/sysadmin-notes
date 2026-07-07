import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectAccessService } from './project-access.service';
import { ProjectMembersService } from './project-members.service';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectAccessService, ProjectMembersService],
  exports: [ProjectsService, ProjectAccessService, ProjectMembersService],
})
export class ProjectsModule {}