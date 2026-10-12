import {
    CreateAssessmentDTO,
    UpdateAssessmentDTO,
    AssessmentResponse,
    ListAssessmentsQuery,
    PaginatedAssessmentResponse,
    AssessmentDetailResponse,
    SuccessMessageResponse,
} from "./model";
import { prisma } from "@/database/prisma-client";
import { Prisma } from "@/generated/prisma";
import type { Option } from "../questions/model";

export abstract class AssessmentService {
    /**
     * List assessments with pagination and filters
     */
    static async list(query: ListAssessmentsQuery): Promise<PaginatedAssessmentResponse> {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const offset = (page - 1) * limit;

        const where: Prisma.AssessmentWhereInput = {
            deletedAt: null,
            assessmentType: 'DEFAULT'
        };

        if (query.searchQuery) {
            where.title = {
                contains: query.searchQuery,
                mode: 'insensitive',
            };
        }

        const totalCount = await prisma.assessment.count({ where });

        const assessments = await prisma.assessment.findMany({
            where,
            skip: offset,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { assessmentQuestions: true }
                }
            }
        });

        const totalPages = Math.ceil(totalCount / limit);

        return {
            assessments: assessments.map(a => ({
                id: a.id,
                title: a.title,
                questionsCount: a._count.assessmentQuestions,
                createdAt: a.createdAt,
            })),
            totalCount,
            totalPages,
            currentPage: page,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        };
    }

    /**
     * Get assessment by ID with questions
     */
    static async getById(id: string): Promise<AssessmentDetailResponse | null> {
        const assessment = await prisma.assessment.findFirst({
            where: { id, deletedAt: null },
            include: {
                assessmentQuestions: {
                    include: {
                        question: {
                            include: {
                                category: {
                                    select: { id: true, name: true }
                                }
                            }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!assessment) return null;

        return {
            id: assessment.id,
            title: assessment.title,
            questionsCount: assessment.assessmentQuestions.length,
            createdAt: assessment.createdAt,
            questions: assessment.assessmentQuestions.map(aq => ({
                ...aq.question,
                options: aq.question.options as Option[] | null,
            })),
        };
    }

    /**
     * Delete an assessment (soft delete)
     */
    static async delete(id: string): Promise<SuccessMessageResponse> {
        const assessment = await prisma.assessment.findFirst({
            where: { id, deletedAt: null },
        });

        if (!assessment) {
            throw new Error("Assessment not found");
        }

        await prisma.assessment.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });

        return {
            success: true,
            message: "Assessment deleted successfully",
        };
    }

    /**
     * Create a new assessment with questions
     */
    static async create(data: CreateAssessmentDTO): Promise<AssessmentResponse> {
        return await prisma.$transaction(async (tx) => {
            // 1. Create the assessment
            const assessment = await tx.assessment.create({
                data: {
                    title: data.title,
                },
            });

            // 2. Link questions to the assessment
            // We create AssessmentQuestion records for each questionId
            await tx.assessmentQuestion.createMany({
                data: data.questionIds.map((questionId) => ({
                    assessmentId: assessment.id,
                    questionId: questionId,
                })),
            });

            // 3. Return the response
            return {
                id: assessment.id,
                title: assessment.title,
                questionsCount: data.questionIds.length,
                createdAt: assessment.createdAt,
            };
        });
    }

    /**
     * Update an assessment
     */
    static async update(id: string, data: UpdateAssessmentDTO): Promise<AssessmentResponse> {
        return await prisma.$transaction(async (tx) => {
            // 1. Check if assessment exists
            const existingAssessment = await tx.assessment.findUnique({
                where: { id },
                include: { assessmentQuestions: true }
            });

            if (!existingAssessment) {
                throw new Error("Assessment not found");
            }

            // 2. Update assessment details if provided
            if (data.title) {
                await tx.assessment.update({
                    where: { id },
                    data: {
                        title: data.title,
                    },
                });
            }

            // 3. Update questions if provided
            let finalQuestionCount = existingAssessment.assessmentQuestions.length;
            if (data.questionIds) {
                // Remove all existing questions for this assessment
                await tx.assessmentQuestion.deleteMany({
                    where: { assessmentId: id },
                });

                // Add new questions
                await tx.assessmentQuestion.createMany({
                    data: data.questionIds.map((questionId: string) => ({
                        assessmentId: id,
                        questionId: questionId,
                    })),
                });
                finalQuestionCount = data.questionIds.length;
            }

            // 4. Fetch updated assessment to return
            const updatedAssessment = await tx.assessment.findUniqueOrThrow({
                where: { id },
            });

            return {
                id: updatedAssessment.id,
                title: updatedAssessment.title,
                questionsCount: finalQuestionCount,
                createdAt: updatedAssessment.createdAt,
            };
        });
    }
}
