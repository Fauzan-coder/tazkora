/*
  Warnings:

  - You are about to drop the column `teamMemberId` on the `team_updates` table. All the data in the column will be lost.
  - You are about to drop the column `teamTaskId` on the `team_updates` table. All the data in the column will be lost.
  - Added the required column `memberId` to the `team_updates` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "team_updates" DROP CONSTRAINT "team_updates_teamMemberId_fkey";

-- DropForeignKey
ALTER TABLE "team_updates" DROP CONSTRAINT "team_updates_teamTaskId_fkey";

-- AlterTable
ALTER TABLE "team_updates" DROP COLUMN "teamMemberId",
DROP COLUMN "teamTaskId",
ADD COLUMN     "memberId" TEXT NOT NULL,
ADD COLUMN     "taskId" TEXT,
ADD COLUMN     "teamId" TEXT;

-- AddForeignKey
ALTER TABLE "team_updates" ADD CONSTRAINT "team_updates_taskId_teamId_fkey" FOREIGN KEY ("taskId", "teamId") REFERENCES "team_tasks"("taskId", "teamId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_updates" ADD CONSTRAINT "team_updates_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "team_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
