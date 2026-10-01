-- AlterTable
ALTER TABLE "BookModule" ADD COLUMN "checkoutUrl" TEXT;

-- CreateTable
CREATE TABLE "ModuleVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 60,
    "script" TEXT NOT NULL DEFAULT '',
    "keyPoints" TEXT NOT NULL DEFAULT '',
    "videoUrl" TEXT,
    "isPreview" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModuleVideo_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BookModule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ModuleVideo_moduleId_position_idx" ON "ModuleVideo"("moduleId", "position");

