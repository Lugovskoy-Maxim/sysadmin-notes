import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [ProjectsModule],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}