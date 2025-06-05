-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('NOT_STARTED', 'STARTED', 'PAUSED', 'COMPLETED');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "workStatus" "WorkStatus" NOT NULL DEFAULT 'NOT_STARTED';
