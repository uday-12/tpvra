-- AlterTable
ALTER TABLE "user" ADD COLUMN     "assessorName" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "licenseNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "termsAccepted" BOOLEAN NOT NULL DEFAULT false;
