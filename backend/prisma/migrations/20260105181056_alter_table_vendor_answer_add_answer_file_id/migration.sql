/*
  Warnings:

  - Added the required column `file_id` to the `vendor_answers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "vendor_answers" ADD COLUMN     "file_id" UUID NOT NULL;
