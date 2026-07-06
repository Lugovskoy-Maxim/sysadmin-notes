import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccessShareDto, CreateShareDto } from './dto/share.dto';
import { SharesService } from './shares.service';

@Controller('shares')
export class SharesController {
  constructor(private shares: SharesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: { user: { id: string } }, @Body() dto: CreateShareDto) {
    return this.shares.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findMine(@Req() req: { user: { id: string } }) {
    return this.shares.findMine(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.shares.remove(req.user.id, id);
  }

  @Throttle({ share: { limit: 20, ttl: 60_000 } })
  @Get('public/:token')
  async getPublicPreview(@Param('token') token: string) {
    try {
      return await this.shares.getPublic(token);
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        const response = err.getResponse();
        if (typeof response === 'object' && response && 'requiresPassword' in response) {
          return { requiresPassword: true };
        }
      }
      throw err;
    }
  }

  @Throttle({ share: { limit: 10, ttl: 60_000 } })
  @Post('public/:token')
  accessPublic(@Param('token') token: string, @Body() dto: AccessShareDto) {
    return this.shares.getPublic(token, dto.password);
  }
}