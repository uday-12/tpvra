-- AlterTable
ALTER TABLE "files" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT,
ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "mime_type" TEXT,
ADD COLUMN     "s3_bucket" TEXT,
ADD COLUMN     "uploaded_by" TEXT,
ADD COLUMN     "url" TEXT;
