/*
  Warnings:

  - You are about to drop the column `memberId` on the `team_updates` table. All the data in the column will be lost.
  - You are about to drop the column `taskId` on the `team_updates` table. All the data in the column will be lost.
  - You are about to drop the column `teamId` on the `team_updates` table. All the data in the column will be lost.
  - Added the required column `teamMemberId` to the `team_updates` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "team_updates" DROP CONSTRAINT "team_updates_memberId_fkey";

-- DropForeignKey
ALTER TABLE "team_updates" DROP CONSTRAINT "team_updates_taskId_teamId_fkey";

-- AlterTable
ALTER TABLE "team_updates" DROP COLUMN "memberId",
DROP COLUMN "taskId",
DROP COLUMN "teamId",
ADD COLUMN     "teamMemberId" TEXT NOT NULL,
ADD COLUMN     "teamTaskId" TEXT;

-- AddForeignKey
ALTER TABLE "team_updates" ADD CONSTRAINT "team_updates_teamTaskId_fkey" FOREIGN KEY ("teamTaskId") REFERENCES "team_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_updates" ADD CONSTRAINT "team_updates_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "team_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
