/*
  Warnings:

  - You are about to drop the column `audienceType` on the `Event` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "venue" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Event" ("createdAt", "date", "description", "id", "imageUrl", "isActive", "name", "updatedAt", "venue") SELECT "createdAt", "date", "description", "id", "imageUrl", "isActive", "name", "updatedAt", "venue" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE TABLE "new_Suite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "features" TEXT NOT NULL,
    "suiteCost" REAL NOT NULL DEFAULT 0,
    "audienceType" TEXT NOT NULL DEFAULT 'HOME',
    "eventId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Suite_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Suite" ("createdAt", "description", "eventId", "features", "id", "name", "suiteCost", "updatedAt") SELECT "createdAt", "description", "eventId", "features", "id", "name", "suiteCost", "updatedAt" FROM "Suite";
DROP TABLE "Suite";
ALTER TABLE "new_Suite" RENAME TO "Suite";
CREATE UNIQUE INDEX "Suite_eventId_name_key" ON "Suite"("eventId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
