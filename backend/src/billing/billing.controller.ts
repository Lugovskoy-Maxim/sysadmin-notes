import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingService } from './billing.service';
import { SubscribeDto } from './dto/billing.dto';

@Controller('billing')
export class BillingController {
  constructor(private billing: BillingService) {}

  @Get('plans')
  listPlans() {
    return { plans: this.billing.listPlans() };
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  status(@Req() req: { user: { id: string } }) {
    return this.billing.getStatus(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  subscribe(@Req() req: { user: { id: string } }, @Body() dto: SubscribeDto) {
    return this.billing.subscribe(req.user.id, dto.plan);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  cancel(@Req() req: { user: { id: string } }) {
    return this.billing.cancel(req.user.id);
  }
}