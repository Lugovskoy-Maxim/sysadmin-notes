-- AlterTable
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "inventoryColumnDefs" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "equipmentColumnDefs" TEXT NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE IF NOT EXISTS "InventoryItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT,
    "unit" TEXT,
    "location" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "extra" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InventoryWriteOff" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryWriteOff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OfficeRoom" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "building" TEXT,
    "floor" TEXT,
    "columnDefs" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficeRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OfficeEquipmentRow" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "cells" TEXT NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficeEquipmentRow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NetworkMap" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Карта сети',
    "nodes" TEXT NOT NULL DEFAULT '[]',
    "edges" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkMap_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InventoryItem_projectId_updatedAt_idx" ON "InventoryItem"("projectId", "updatedAt");
CREATE INDEX IF NOT EXISTS "InventoryWriteOff_projectId_createdAt_idx" ON "InventoryWriteOff"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryWriteOff_itemId_idx" ON "InventoryWriteOff"("itemId");
CREATE INDEX IF NOT EXISTS "OfficeRoom_projectId_updatedAt_idx" ON "OfficeRoom"("projectId", "updatedAt");
CREATE INDEX IF NOT EXISTS "OfficeEquipmentRow_roomId_sortOrder_idx" ON "OfficeEquipmentRow"("roomId", "sortOrder");
CREATE INDEX IF NOT EXISTS "NetworkMap_projectId_updatedAt_idx" ON "NetworkMap"("projectId", "updatedAt");

DO $$ BEGIN
  ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "InventoryWriteOff" ADD CONSTRAINT "InventoryWriteOff_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "InventoryWriteOff" ADD CONSTRAINT "InventoryWriteOff_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "OfficeRoom" ADD CONSTRAINT "OfficeRoom_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "OfficeEquipmentRow" ADD CONSTRAINT "OfficeEquipmentRow_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "OfficeRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "NetworkMap" ADD CONSTRAINT "NetworkMap_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;