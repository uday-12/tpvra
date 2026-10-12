-- DropIndex
DROP INDEX "uq_assessor_vendor";

-- AlterTable
ALTER TABLE "vendor_answers" ALTER COLUMN "file_id" DROP NOT NULL;
