import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProjectDto, ImportNotesDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectsService } from './projects.service';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @Get()
  findAll(@Req() req: { user: { id: string } }) {
    return this.projects.findAll(req.user.id);
  }

  @Get(':id/export')
  export(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.projects.exportProject(req.user.id, id);
  }

  @Get(':id')
  findOne(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.projects.findOne(req.user.id, id);
  }

  @Post()
  create(@Req() req: { user: { id: string } }, @Body() dto: CreateProjectDto) {
    return this.projects.create(req.user.id, dto);
  }

  @Post(':id/import')
  importNotes(@Req() req: { user: { id: string } }, @Param('id') id: string, @Body() body: ImportNotesDto) {
    return this.projects.importNotes(req.user.id, id, body.notes ?? []);
  }

  @Patch(':id')
  update(@Req() req: { user: { id: string } }, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.projects.remove(req.user.id, id);
  }
}