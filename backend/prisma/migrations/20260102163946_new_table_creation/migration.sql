-- CreateEnum
CREATE TYPE "assessment_status_enum" AS ENUM ('SUBMITTED', 'PENDING', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "risk_rating_enum" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "question_type_enum" AS ENUM ('TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'BOOLEAN', 'NUMBER');

-- CreateEnum
CREATE TYPE "payment_status_enum" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_text" TEXT NOT NULL,
    "question_type" "question_type_enum" NOT NULL,
    "risk_rating" "risk_rating_enum" NOT NULL,
    "options" JSONB,
    "category_id" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "assessment_type" TEXT NOT NULL DEFAULT 'DEFAULT',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessment_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessor_vendor_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessor_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "parent_assessment_id" UUID,
    "submitted_assessment_id" UUID,
    "status" "assessment_status_enum" NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessor_vendor_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" TEXT NOT NULL,
    "question_id" UUID NOT NULL,
    "answer" TEXT NOT NULL,
    "answer_explanation" TEXT,
    "risk_rating" "risk_rating_enum" NOT NULL,
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_answer_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_answer_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_answer_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clarifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessor_vendor_assessment_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "clarification_requested" TEXT NOT NULL,
    "clarification_answer" TEXT,
    "clarification_file_id" UUID,
    "due_date" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clarifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "file_name" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "file_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_method" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "payment_status_enum" NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "assessment_id" UUID NOT NULL,
    "assessor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "notification_date" TIMESTAMP(3) NOT NULL,
    "sender_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "questions_category_id_idx" ON "questions"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_assessment_question" ON "assessment_questions"("assessment_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_assessor_vendor" ON "assessor_vendor_assessments"("assessor_id", "vendor_id");

-- CreateIndex
CREATE INDEX "vendor_answers_vendor_id_idx" ON "vendor_answers"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_answers_question_id_idx" ON "vendor_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_vendor_question" ON "vendor_answers"("vendor_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_answer_file" ON "vendor_answer_files"("vendor_answer_id", "file_id");

-- CreateIndex
CREATE INDEX "payments_vendor_id_idx" ON "payments"("vendor_id");

-- CreateIndex
CREATE INDEX "payments_assessment_id_idx" ON "payments"("assessment_id");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessor_vendor_assessments" ADD CONSTRAINT "assessor_vendor_assessments_assessor_id_fkey" FOREIGN KEY ("assessor_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessor_vendor_assessments" ADD CONSTRAINT "assessor_vendor_assessments_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessor_vendor_assessments" ADD CONSTRAINT "assessor_vendor_assessments_parent_assessment_id_fkey" FOREIGN KEY ("parent_assessment_id") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessor_vendor_assessments" ADD CONSTRAINT "assessor_vendor_assessments_submitted_assessment_id_fkey" FOREIGN KEY ("submitted_assessment_id") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_answers" ADD CONSTRAINT "vendor_answers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_answers" ADD CONSTRAINT "vendor_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_answer_files" ADD CONSTRAINT "vendor_answer_files_vendor_answer_id_fkey" FOREIGN KEY ("vendor_answer_id") REFERENCES "vendor_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_answer_files" ADD CONSTRAINT "vendor_answer_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarifications" ADD CONSTRAINT "clarifications_assessor_vendor_assessment_id_fkey" FOREIGN KEY ("assessor_vendor_assessment_id") REFERENCES "assessor_vendor_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarifications" ADD CONSTRAINT "clarifications_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarifications" ADD CONSTRAINT "clarifications_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clarifications" ADD CONSTRAINT "clarifications_clarification_file_id_fkey" FOREIGN KEY ("clarification_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_assessor_id_fkey" FOREIGN KEY ("assessor_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
