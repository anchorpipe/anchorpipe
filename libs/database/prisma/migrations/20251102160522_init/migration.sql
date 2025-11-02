/*
  Warnings:

  - You are about to drop the column `repoId` on the `flake_scores` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."flake_scores" DROP CONSTRAINT "flake_scores_repoId_fkey";

-- AlterTable
ALTER TABLE "flake_scores" DROP COLUMN "repoId";
