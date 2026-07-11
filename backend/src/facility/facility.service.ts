import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingService } from '../billing/billing.service';
import { safeJsonParse } from '../common/json.util';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService, ProjectRole } from '../projects/project-access.service';
import {
  CreateContactDto,
  CreateEquipmentRowDto,
  CreateInventoryItemDto,
  CreateNetworkMapDto,
  CreateOfficeRoomDto,
  CreateWriteOffDto,
  UpdateColumnDefsDto,
  UpdateContactDto,
  UpdateEquipmentRowDto,
  UpdateInventoryItemDto,
  UpdateNetworkMapDto,
  UpdateOfficeRoomDto,
} from './dto/facility.dto';

@Injectable()
export class FacilityService {
  constructor(
    private prisma: PrismaService,
    private access: ProjectAccessService,
    private billing: BillingService,
  ) {}

  private async assertProject(userId: string, projectId: string, minRole: ProjectRole = 'viewer') {
    await this.billing.assertProjectFeature(projectId, 'facility');
    const { project } = await this.access.assertAccess(userId, projectId, minRole);
    return project;
  }

  private async assertProjectAccess(userId: string, projectId: string, minRole: ProjectRole = 'viewer') {
    const { project } = await this.access.assertAccess(userId, projectId, minRole);
    return project;
  }

  private formatInventoryItem<
    T extends {
      extra: string;
      createdAt: Date;
      updatedAt: Date;
    },
  >(item: T) {
    return {
      ...item,
      extra: safeJsonParse<Record<string, unknown>>(item.extra, {}),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private formatWriteOff<
    T extends {
      createdAt: Date;
      item?: { name: string; sku: string | null; unit: string | null };
    },
  >(entry: T) {
    return {
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    };
  }

  private formatRoom<
    T extends {
      columnDefs: string;
      createdAt: Date;
      updatedAt: Date;
      rows?: {
        cells: string;
        createdAt: Date;
        updatedAt: Date;
      }[];
    },
  >(room: T) {
    const { rows, ...rest } = room;
    return {
      ...rest,
      columnDefs: safeJsonParse(rest.columnDefs, []),
      createdAt: rest.createdAt.toISOString(),
      updatedAt: rest.updatedAt.toISOString(),
      rows: rows?.map((row) => ({
        ...row,
        cells: safeJsonParse(row.cells, {}),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  private formatNetworkMap<
    T extends {
      nodes: string;
      edges: string;
      createdAt: Date;
      updatedAt: Date;
    },
  >(map: T) {
    return {
      ...map,
      nodes: safeJsonParse(map.nodes, []),
      edges: safeJsonParse(map.edges, []),
      createdAt: map.createdAt.toISOString(),
      updatedAt: map.updatedAt.toISOString(),
    };
  }

  async listInventory(userId: string, projectId: string) {
    await this.assertProject(userId, projectId, 'viewer');
    const items = await this.prisma.inventoryItem.findMany({
      where: { projectId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return items.map((item) => this.formatInventoryItem(item));
  }

  async createInventoryItem(userId: string, dto: CreateInventoryItemDto) {
    await this.assertProject(userId, dto.projectId, 'editor');
    const item = await this.prisma.inventoryItem.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        sku: dto.sku,
        category: dto.category,
        unit: dto.unit,
        location: dto.location,
        quantity: dto.quantity ?? 0,
        minStock: dto.minStock ?? 0,
        extra: JSON.stringify(dto.extra ?? {}),
      },
    });
    return this.formatInventoryItem(item);
  }

  async updateInventoryItem(userId: string, id: string, dto: UpdateInventoryItemDto) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Позиция не найдена');
    await this.assertProject(userId, item.projectId, 'editor');
    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        ...dto,
        extra: dto.extra ? JSON.stringify(dto.extra) : undefined,
      },
    });
    return this.formatInventoryItem(updated);
  }

  async removeInventoryItem(userId: string, id: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Позиция не найдена');
    await this.assertProject(userId, item.projectId, 'editor');
    await this.prisma.inventoryItem.delete({ where: { id } });
    return { ok: true };
  }

  async listWriteOffs(userId: string, projectId: string) {
    await this.assertProject(userId, projectId, 'viewer');
    const entries = await this.prisma.inventoryWriteOff.findMany({
      where: { projectId },
      include: { item: { select: { name: true, sku: true, unit: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return entries.map((entry) => this.formatWriteOff(entry));
  }

  async createWriteOff(userId: string, dto: CreateWriteOffDto) {
    await this.assertProject(userId, dto.projectId, 'editor');
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: dto.itemId } });
    if (!item || item.projectId !== dto.projectId) throw new NotFoundException('Позиция не найдена');
    if (item.quantity < dto.quantity) {
      throw new BadRequestException('Недостаточно остатка для списания');
    }

    const [writeOff] = await this.prisma.$transaction([
      this.prisma.inventoryWriteOff.create({
        data: {
          projectId: dto.projectId,
          itemId: dto.itemId,
          quantity: dto.quantity,
          reason: dto.reason,
          comment: dto.comment,
        },
        include: { item: { select: { name: true, sku: true, unit: true } } },
      }),
      this.prisma.inventoryItem.update({
        where: { id: dto.itemId },
        data: { quantity: item.quantity - dto.quantity },
      }),
    ]);

    return this.formatWriteOff(writeOff);
  }

  async listRooms(userId: string, projectId: string) {
    await this.assertProject(userId, projectId, 'viewer');
    const rooms = await this.prisma.officeRoom.findMany({
      where: { projectId },
      include: { rows: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ building: 'asc' }, { floor: 'asc' }, { name: 'asc' }],
    });
    return rooms.map((room) => this.formatRoom(room));
  }

  async createRoom(userId: string, dto: CreateOfficeRoomDto) {
    await this.assertProject(userId, dto.projectId, 'editor');
    const room = await this.prisma.officeRoom.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        building: dto.building,
        floor: dto.floor,
      },
      include: { rows: true },
    });
    return this.formatRoom(room);
  }

  async updateRoom(userId: string, id: string, dto: UpdateOfficeRoomDto) {
    const room = await this.prisma.officeRoom.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Кабинет не найден');
    await this.assertProject(userId, room.projectId, 'editor');
    const updated = await this.prisma.officeRoom.update({
      where: { id },
      data: {
        name: dto.name,
        building: dto.building,
        floor: dto.floor,
        columnDefs: dto.columnDefs ? JSON.stringify(dto.columnDefs) : undefined,
      },
      include: { rows: { orderBy: { sortOrder: 'asc' } } },
    });
    return this.formatRoom(updated);
  }

  async removeRoom(userId: string, id: string) {
    const room = await this.prisma.officeRoom.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Кабинет не найден');
    await this.assertProject(userId, room.projectId, 'editor');
    await this.prisma.officeRoom.delete({ where: { id } });
    return { ok: true };
  }

  async createEquipmentRow(userId: string, dto: CreateEquipmentRowDto) {
    const room = await this.prisma.officeRoom.findUnique({ where: { id: dto.roomId } });
    if (!room) throw new NotFoundException('Кабинет не найден');
    await this.assertProject(userId, room.projectId, 'editor');
    const maxOrder = await this.prisma.officeEquipmentRow.aggregate({
      where: { roomId: dto.roomId },
      _max: { sortOrder: true },
    });
    const row = await this.prisma.officeEquipmentRow.create({
      data: {
        roomId: dto.roomId,
        label: dto.label ?? '',
        cells: JSON.stringify(dto.cells ?? {}),
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    return {
      ...row,
      cells: safeJsonParse(row.cells, {}),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateEquipmentRow(userId: string, id: string, dto: UpdateEquipmentRowDto) {
    const row = await this.prisma.officeEquipmentRow.findUnique({
      where: { id },
      include: { room: { select: { projectId: true } } },
    });
    if (!row) throw new NotFoundException('Строка не найдена');
    await this.assertProject(userId, row.room.projectId, 'editor');
    const updated = await this.prisma.officeEquipmentRow.update({
      where: { id },
      data: {
        label: dto.label,
        sortOrder: dto.sortOrder,
        cells: dto.cells ? JSON.stringify(dto.cells) : undefined,
      },
    });
    return {
      ...updated,
      cells: safeJsonParse(updated.cells, {}),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async removeEquipmentRow(userId: string, id: string) {
    const row = await this.prisma.officeEquipmentRow.findUnique({
      where: { id },
      include: { room: { select: { projectId: true } } },
    });
    if (!row) throw new NotFoundException('Строка не найдена');
    await this.assertProject(userId, row.room.projectId, 'editor');
    await this.prisma.officeEquipmentRow.delete({ where: { id } });
    return { ok: true };
  }

  async getColumnDefs(userId: string, projectId: string) {
    const project = await this.assertProject(userId, projectId, 'editor');
    return {
      inventoryColumnDefs: safeJsonParse(project.inventoryColumnDefs, []),
      equipmentColumnDefs: safeJsonParse(project.equipmentColumnDefs, []),
    };
  }

  async updateColumnDefs(userId: string, projectId: string, dto: UpdateColumnDefsDto) {
    await this.assertProject(userId, projectId, 'viewer');
    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        inventoryColumnDefs: dto.inventoryColumnDefs
          ? JSON.stringify(dto.inventoryColumnDefs)
          : undefined,
        equipmentColumnDefs: dto.equipmentColumnDefs
          ? JSON.stringify(dto.equipmentColumnDefs)
          : undefined,
      },
    });
    return {
      inventoryColumnDefs: safeJsonParse(updated.inventoryColumnDefs, []),
      equipmentColumnDefs: safeJsonParse(updated.equipmentColumnDefs, []),
    };
  }

  async listNetworkMaps(userId: string, projectId: string) {
    await this.assertProject(userId, projectId, 'viewer');
    const maps = await this.prisma.networkMap.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });
    return maps.map((map) => this.formatNetworkMap(map));
  }

  async getNetworkMap(userId: string, id: string) {
    const map = await this.prisma.networkMap.findUnique({ where: { id } });
    if (!map) throw new NotFoundException('Карта не найдена');
    await this.assertProject(userId, map.projectId, 'editor');
    return this.formatNetworkMap(map);
  }

  async createNetworkMap(userId: string, dto: CreateNetworkMapDto) {
    await this.assertProject(userId, dto.projectId, 'editor');
    const map = await this.prisma.networkMap.create({
      data: {
        projectId: dto.projectId,
        name: dto.name ?? 'Карта сети',
      },
    });
    return this.formatNetworkMap(map);
  }

  async updateNetworkMap(userId: string, id: string, dto: UpdateNetworkMapDto) {
    const map = await this.prisma.networkMap.findUnique({ where: { id } });
    if (!map) throw new NotFoundException('Карта не найдена');
    await this.assertProject(userId, map.projectId, 'editor');
    const updated = await this.prisma.networkMap.update({
      where: { id },
      data: {
        name: dto.name,
        nodes: dto.nodes ? JSON.stringify(dto.nodes) : undefined,
        edges: dto.edges ? JSON.stringify(dto.edges) : undefined,
      },
    });
    return this.formatNetworkMap(updated);
  }

  async removeNetworkMap(userId: string, id: string) {
    const map = await this.prisma.networkMap.findUnique({ where: { id } });
    if (!map) throw new NotFoundException('Карта не найдена');
    await this.assertProject(userId, map.projectId, 'editor');
    await this.prisma.networkMap.delete({ where: { id } });
    return { ok: true };
  }

  private formatContact<T extends { createdAt: Date; updatedAt: Date }>(contact: T) {
    return {
      ...contact,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
    };
  }

  async listContacts(userId: string, projectId: string) {
    await this.assertProjectAccess(userId, projectId, 'viewer');
    const contacts = await this.prisma.contact.findMany({
      where: { projectId },
      orderBy: [{ fullName: 'asc' }, { updatedAt: 'desc' }],
    });
    return contacts.map((contact) => this.formatContact(contact));
  }

  async createContact(userId: string, dto: CreateContactDto) {
    await this.assertProjectAccess(userId, dto.projectId, 'editor');
    const contact = await this.prisma.contact.create({
      data: {
        projectId: dto.projectId,
        fullName: dto.fullName.trim() || 'Новый контакт',
        phone: dto.phone,
        email: dto.email,
        position: dto.position,
        department: dto.department,
        extra: dto.extra,
      },
    });
    return this.formatContact(contact);
  }

  async updateContact(userId: string, id: string, dto: UpdateContactDto) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Контакт не найден');
    await this.assertProjectAccess(userId, contact.projectId, 'editor');
    const updated = await this.prisma.contact.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim() || undefined,
        phone: dto.phone,
        email: dto.email,
        position: dto.position,
        department: dto.department,
        extra: dto.extra,
      },
    });
    return this.formatContact(updated);
  }

  async removeContact(userId: string, id: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Контакт не найден');
    await this.assertProjectAccess(userId, contact.projectId, 'editor');
    await this.prisma.contact.delete({ where: { id } });
    return { ok: true };
  }
}