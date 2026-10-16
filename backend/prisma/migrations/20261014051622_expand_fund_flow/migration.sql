/*
  Warnings:

  - Added the required column `updatedAt` to the `fund_flows` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_fund_flows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "mainNet" REAL NOT NULL DEFAULT 0,
    "mainNet5d" REAL NOT NULL DEFAULT 0,
    "mainNet10d" REAL NOT NULL DEFAULT 0,
    "superLargeNet" REAL NOT NULL DEFAULT 0,
    "largeNet" REAL NOT NULL DEFAULT 0,
    "mediumNet" REAL NOT NULL DEFAULT 0,
    "smallNet" REAL NOT NULL DEFAULT 0,
    "mainNetRatio" REAL,
    "turnover" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fund_flows_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_fund_flows" ("date", "id", "stockId") SELECT "date", "id", "stockId" FROM "fund_flows";
DROP TABLE "fund_flows";
ALTER TABLE "new_fund_flows" RENAME TO "fund_flows";
CREATE INDEX "fund_flows_date_idx" ON "fund_flows"("date");
CREATE UNIQUE INDEX "fund_flows_stockId_date_key" ON "fund_flows"("stockId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
