/*
  Warnings:

  - You are about to drop the column `amount` on the `assessments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "assessments" DROP COLUMN "amount";

-- AlterTable
ALTER TABLE "assessor_vendor_assessments" ADD COLUMN     "amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
