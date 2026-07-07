import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateEquipmentRowDto,
  CreateInventoryItemDto,
  CreateNetworkMapDto,
  CreateOfficeRoomDto,
  CreateWriteOffDto,
  UpdateColumnDefsDto,
  UpdateEquipmentRowDto,
  UpdateInventoryItemDto,
  UpdateNetworkMapDto,
  UpdateOfficeRoomDto,
} from './dto/facility.dto';
import { FacilityService } from './facility.service';

@UseGuards(JwtAuthGuard)
@Controller('facility')
export class FacilityController {
  constructor(private facility: FacilityService) {}

  @Get('inventory')
  listInventory(@Req() req: { user: { id: string } }, @Query('projectId') projectId: string) {
    return this.facility.listInventory(req.user.id, projectId);
  }

  @Post('inventory')
  createInventory(@Req() req: { user: { id: string } }, @Body() dto: CreateInventoryItemDto) {
    return this.facility.createInventoryItem(req.user.id, dto);
  }

  @Patch('inventory/:id')
  updateInventory(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.facility.updateInventoryItem(req.user.id, id, dto);
  }

  @Delete('inventory/:id')
  removeInventory(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.facility.removeInventoryItem(req.user.id, id);
  }

  @Get('write-offs')
  listWriteOffs(@Req() req: { user: { id: string } }, @Query('projectId') projectId: string) {
    return this.facility.listWriteOffs(req.user.id, projectId);
  }

  @Post('write-offs')
  createWriteOff(@Req() req: { user: { id: string } }, @Body() dto: CreateWriteOffDto) {
    return this.facility.createWriteOff(req.user.id, dto);
  }

  @Get('rooms')
  listRooms(@Req() req: { user: { id: string } }, @Query('projectId') projectId: string) {
    return this.facility.listRooms(req.user.id, projectId);
  }

  @Post('rooms')
  createRoom(@Req() req: { user: { id: string } }, @Body() dto: CreateOfficeRoomDto) {
    return this.facility.createRoom(req.user.id, dto);
  }

  @Patch('rooms/:id')
  updateRoom(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateOfficeRoomDto,
  ) {
    return this.facility.updateRoom(req.user.id, id, dto);
  }

  @Delete('rooms/:id')
  removeRoom(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.facility.removeRoom(req.user.id, id);
  }

  @Post('equipment-rows')
  createEquipmentRow(@Req() req: { user: { id: string } }, @Body() dto: CreateEquipmentRowDto) {
    return this.facility.createEquipmentRow(req.user.id, dto);
  }

  @Patch('equipment-rows/:id')
  updateEquipmentRow(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentRowDto,
  ) {
    return this.facility.updateEquipmentRow(req.user.id, id, dto);
  }

  @Delete('equipment-rows/:id')
  removeEquipmentRow(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.facility.removeEquipmentRow(req.user.id, id);
  }

  @Get('column-defs')
  getColumnDefs(@Req() req: { user: { id: string } }, @Query('projectId') projectId: string) {
    return this.facility.getColumnDefs(req.user.id, projectId);
  }

  @Patch('column-defs')
  updateColumnDefs(
    @Req() req: { user: { id: string } },
    @Query('projectId') projectId: string,
    @Body() dto: UpdateColumnDefsDto,
  ) {
    return this.facility.updateColumnDefs(req.user.id, projectId, dto);
  }

  @Get('network-maps')
  listNetworkMaps(@Req() req: { user: { id: string } }, @Query('projectId') projectId: string) {
    return this.facility.listNetworkMaps(req.user.id, projectId);
  }

  @Get('network-maps/:id')
  getNetworkMap(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.facility.getNetworkMap(req.user.id, id);
  }

  @Post('network-maps')
  createNetworkMap(@Req() req: { user: { id: string } }, @Body() dto: CreateNetworkMapDto) {
    return this.facility.createNetworkMap(req.user.id, dto);
  }

  @Patch('network-maps/:id')
  updateNetworkMap(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateNetworkMapDto,
  ) {
    return this.facility.updateNetworkMap(req.user.id, id, dto);
  }

  @Delete('network-maps/:id')
  removeNetworkMap(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.facility.removeNetworkMap(req.user.id, id);
  }
}