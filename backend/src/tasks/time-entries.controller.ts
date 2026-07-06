import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTimeEntryDto, StartTimerDto, UpdateTimeEntryDto } from './dto/time-entry.dto';
import { TimeEntriesService } from './time-entries.service';

@UseGuards(JwtAuthGuard)
@Controller('time-entries')
export class TimeEntriesController {
  constructor(private timeEntries: TimeEntriesService) {}

  @Get('active')
  getActive(@Req() req: { user: { id: string } }) {
    return this.timeEntries.getActive(req.user.id);
  }

  @Get('summary')
  getSummary(
    @Req() req: { user: { id: string } },
    @Query('projectId') projectId?: string,
    @Query('period') period?: 'today' | 'week',
  ) {
    return this.timeEntries.getSummary(req.user.id, projectId, period ?? 'today');
  }

  @Get()
  findByProject(
    @Req() req: { user: { id: string } },
    @Query('projectId') projectId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.timeEntries.findByProject(req.user.id, projectId, from, to);
  }

  @Post('start')
  start(@Req() req: { user: { id: string } }, @Body() dto: StartTimerDto) {
    return this.timeEntries.start(req.user.id, dto);
  }

  @Post()
  createManual(@Req() req: { user: { id: string } }, @Body() dto: CreateTimeEntryDto) {
    return this.timeEntries.createManual(req.user.id, dto);
  }

  @Patch(':id/stop')
  stop(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.timeEntries.stop(req.user.id, id);
  }

  @Patch(':id')
  update(@Req() req: { user: { id: string } }, @Param('id') id: string, @Body() dto: UpdateTimeEntryDto) {
    return this.timeEntries.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.timeEntries.remove(req.user.id, id);
  }
}