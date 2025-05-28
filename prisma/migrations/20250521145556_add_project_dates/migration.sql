-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'PLANNING';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3);
