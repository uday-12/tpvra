/*
  Warnings:

  - Changed the type of `status` on the `clarifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "clarification_status_enum" AS ENUM ('PENDING', 'SUBMITTED');

-- AlterTable
ALTER TABLE "clarifications" DROP COLUMN "status",
ADD COLUMN     "status" "clarification_status_enum" NOT NULL;
