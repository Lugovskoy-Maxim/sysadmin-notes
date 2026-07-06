import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntriesService } from './time-entries.service';

@Module({
  controllers: [TasksController, TimeEntriesController],
  providers: [TasksService, TimeEntriesService],
  exports: [TasksService, TimeEntriesService],
})
export class TasksModule {}