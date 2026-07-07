import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { UpdateUserAdminDto } from './dto/admin.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('users')
  listUsers() {
    return this.admin.listUsers();
  }

  @Patch('users/:id')
  updateUser(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateUserAdminDto,
  ) {
    return this.admin.updateUser(req.user.id, id, dto);
  }
}