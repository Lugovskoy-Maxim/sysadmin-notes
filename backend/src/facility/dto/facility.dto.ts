import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateInventoryItemDto {
  @IsString()
  projectId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}

export class UpdateInventoryItemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}

export class CreateWriteOffDto {
  @IsString()
  projectId!: string;

  @IsString()
  itemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateOfficeRoomDto {
  @IsString()
  projectId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsString()
  floor?: string;
}

export class UpdateOfficeRoomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  columnDefs?: unknown[];
}

export class CreateEquipmentRowDto {
  @IsString()
  roomId!: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsObject()
  cells?: Record<string, string | boolean | number | null>;
}

export class UpdateEquipmentRowDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsObject()
  cells?: Record<string, string | boolean | number | null>;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateColumnDefsDto {
  @IsOptional()
  inventoryColumnDefs?: unknown[];

  @IsOptional()
  equipmentColumnDefs?: unknown[];
}

export class CreateNetworkMapDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class UpdateNetworkMapDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  nodes?: unknown[];

  @IsOptional()
  edges?: unknown[];
}