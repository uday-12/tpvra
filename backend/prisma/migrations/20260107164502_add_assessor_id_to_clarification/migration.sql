-- AlterTable
ALTER TABLE "clarifications" ADD COLUMN     "assessor_id" TEXT;

-- AddForeignKey
ALTER TABLE "clarifications" ADD CONSTRAINT "clarifications_assessor_id_fkey" FOREIGN KEY ("assessor_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
