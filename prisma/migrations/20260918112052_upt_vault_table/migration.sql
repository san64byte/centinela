/*
  Warnings:

  - You are about to drop the column `title` on the `vault` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `vault` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `vault` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "vault_userId_type_idx";

-- AlterTable
ALTER TABLE "vault" DROP COLUMN "title",
DROP COLUMN "type",
DROP COLUMN "url";

-- DropEnum
DROP TYPE "VaultItemType";
