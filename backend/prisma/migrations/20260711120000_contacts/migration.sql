-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "position" TEXT,
    "department" TEXT,
    "extra" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contact_projectId_updatedAt_idx" ON "Contact"("projectId", "updatedAt");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;