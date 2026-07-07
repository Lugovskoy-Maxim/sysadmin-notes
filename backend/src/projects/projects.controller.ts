import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto/member.dto';
import { CreateProjectDto, ImportNotesDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectMembersService } from './project-members.service';
import { ProjectsService } from './projects.service';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private projects: ProjectsService,
    private members: ProjectMembersService,
  ) {}

  @Get()
  findAll(@Req() req: { user: { id: string } }) {
    return this.projects.findAll(req.user.id);
  }

  @Get(':id/members')
  listMembers(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.members.list(req.user.id, id);
  }

  @Post(':id/members')
  inviteMember(@Req() req: { user: { id: string } }, @Param('id') id: string, @Body() dto: InviteMemberDto) {
    return this.members.invite(req.user.id, id, dto.email, dto.role);
  }

  @Patch(':id/members/:memberUserId')
  updateMember(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Param('memberUserId') memberUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.members.updateRole(req.user.id, id, memberUserId, dto.role);
  }

  @Delete(':id/members/:memberUserId')
  removeMember(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Param('memberUserId') memberUserId: string,
  ) {
    return this.members.remove(req.user.id, id, memberUserId);
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