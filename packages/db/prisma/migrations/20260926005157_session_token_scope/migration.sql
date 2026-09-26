-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SessionAccessToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'quiz',
    "scope" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME,
    "revokedAt" DATETIME,
    CONSTRAINT "SessionAccessToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuizSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SessionAccessToken" ("createdAt", "id", "lastUsedAt", "revokedAt", "sessionId", "source", "tokenHash") SELECT "createdAt", "id", "lastUsedAt", "revokedAt", "sessionId", "source", "tokenHash" FROM "SessionAccessToken";
DROP TABLE "SessionAccessToken";
ALTER TABLE "new_SessionAccessToken" RENAME TO "SessionAccessToken";
CREATE UNIQUE INDEX "SessionAccessToken_tokenHash_key" ON "SessionAccessToken"("tokenHash");
CREATE INDEX "SessionAccessToken_sessionId_idx" ON "SessionAccessToken"("sessionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
