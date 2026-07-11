import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/calendar.dto';
import { CalendarService } from './calendar.service';

@UseGuards(JwtAuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private calendar: CalendarService) {}

  @Get('events')
  list(
    @Req() req: { user: { id: string } },
    @Query('projectId') projectId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.calendar.list(req.user.id, projectId, from, to);
  }

  @Get('upcoming')
  upcoming(
    @Req() req: { user: { id: string } },
    @Query('projectId') projectId: string,
    @Query('days') days?: string,
  ) {
    const horizon = days ? Number(days) : 30;
    return this.calendar.upcoming(req.user.id, projectId, Number.isFinite(horizon) ? horizon : 30);
  }

  @Post('events')
  create(@Req() req: { user: { id: string } }, @Body() dto: CreateCalendarEventDto) {
    return this.calendar.create(req.user.id, dto);
  }

  @Patch('events/:id')
  update(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.calendar.update(req.user.id, id, dto);
  }

  @Delete('events/:id')
  remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.calendar.remove(req.user.id, id);
  }
}