import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateNoteDto, MoveNoteDto, UpdateNoteDto } from './dto/note.dto';
import { NotesService } from './notes.service';

@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private notes: NotesService) {}

  @Get('search/all')
  search(@Req() req: { user: { id: string } }, @Query('q') q: string) {
    return this.notes.search(req.user.id, q ?? '');
  }

  @Get()
  findByProject(@Req() req: { user: { id: string } }, @Query('projectId') projectId: string) {
    return this.notes.findByProject(req.user.id, projectId);
  }

  @Get(':id')
  findOne(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.notes.findOne(req.user.id, id);
  }

  @Post()
  create(@Req() req: { user: { id: string } }, @Body() dto: CreateNoteDto) {
    return this.notes.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Req() req: { user: { id: string } }, @Param('id') id: string, @Body() dto: UpdateNoteDto) {
    return this.notes.update(req.user.id, id, dto);
  }

  @Patch(':id/move')
  move(@Req() req: { user: { id: string } }, @Param('id') id: string, @Body() dto: MoveNoteDto) {
    return this.notes.move(req.user.id, id, dto);
  }

  @Post(':id/duplicate')
  duplicate(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.notes.duplicate(req.user.id, id);
  }

  @Delete(':id')
  remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.notes.remove(req.user.id, id);
  }
}