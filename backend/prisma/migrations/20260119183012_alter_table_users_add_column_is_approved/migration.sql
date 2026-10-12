-- CreateEnum
CREATE TYPE "user_status_enum" AS ENUM ('APPROVED', 'REJECTED', 'AWAITING_FOR_APPROVAL');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "is_approved" "user_status_enum" NOT NULL DEFAULT 'AWAITING_FOR_APPROVAL';
