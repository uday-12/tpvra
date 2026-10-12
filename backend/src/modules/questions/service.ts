import { prisma } from "@/database/prisma-client";
import type { Prisma } from "@/generated/prisma";
import { QuestionType, RiskRating } from "@/generated/prisma";
import type {
    ListQuestionsQuery,
    PaginatedQuestionResponse,
    SuccessMessageResponse,
    CreateQuestionDTO,
    UpdateQuestionDTO,
    BulkCreateQuestionDTO,
    BulkDeleteQuestionDTO,
    Option
} from "./model";

export abstract class QuestionService {
    /**
     * List questions with pagination and filters
     */
    static async listQuestions(query: ListQuestionsQuery): Promise<PaginatedQuestionResponse> {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const offset = (page - 1) * limit;

        const where: Prisma.QuestionWhereInput = {
            deletedAt: null,
            assessmentQuestions: {
                none: {
                    deletedAt: null,
                    assessment: {
                        assessmentType: 'CLONED',
                        deletedAt: null
                    }
                }
            }
        };

        if (query.searchQuery) {
            where.questionText = {
                contains: query.searchQuery,
                mode: 'insensitive',
            };
        }

        if (query.categoryId) {
            where.categoryId = query.categoryId;
        }

        if (query.questionType) {
            where.questionType = query.questionType as QuestionType;
        }

        if (query.riskRating) {
            where.riskRating = query.riskRating as RiskRating;
        }
        const totalCount = await prisma.question.count({ where });

        const questions = await prisma.question.findMany({
            where,
            skip: offset,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                category: {
                    select: { id: true, name: true }
                }
            }
        });

        const totalPages = Math.ceil(totalCount / limit);

        return {
            questions: questions.map(q => ({
                ...q,
                options: q.options as Option[] | null,
            })),
            totalCount,
            totalPages,
            currentPage: page,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        };
    }

    /**
     * Get question by ID
     */
    static async getById(id: string) {
        const question = await prisma.question.findFirst({
            where: { id, deletedAt: null },
            include: {
                category: {
                    select: { id: true, name: true }
                }
            }
        });

        if (!question) return null;

        return {
            ...question,
            options: question.options as Option[] | null,
        };
    }

    /**
     * Create a new question
     */
    static async create(data: CreateQuestionDTO): Promise<SuccessMessageResponse> {
        // Validate options if type needs them
        if (
            (data.questionType === QuestionType.SINGLE_CHOICE ||
                data.questionType === QuestionType.MULTIPLE_CHOICE ||
                data.questionType === QuestionType.BOOLEAN) &&
            (!data.options || data.options.length === 0)
        ) {
            throw new Error("Options are required for this question type");
        }

        await prisma.question.create({
            data: {
                questionText: data.questionText,
                questionType: data.questionType,
                riskRating: data.riskRating,
                categoryId: data.categoryId,
                options: data.options as Option[],
                rtv: data.rtv,
                recommendation: data.recommendation,
            },
        });

        return {
            success: true,
            message: "Question created successfully",
        };
    }

    /**
     * Bulk create questions
     */
    static async bulkCreate(data: BulkCreateQuestionDTO): Promise<SuccessMessageResponse> {
        // Validate all questions
        data.questions.forEach((q, index) => {
            if (
                (q.questionType === QuestionType.SINGLE_CHOICE ||
                    q.questionType === QuestionType.MULTIPLE_CHOICE ||
                    q.questionType === QuestionType.BOOLEAN) &&
                (!q.options || q.options.length === 0)
            ) {
                throw new Error(`Options are required for question at index ${index}`);
            }
        });

        await prisma.question.createMany({
            data: data.questions.map(q => ({
                questionText: q.questionText,
                questionType: q.questionType,
                riskRating: q.riskRating,
                categoryId: q.categoryId,
                options: q.options as Option[],
                rtv: q.rtv,
                recommendation: q.recommendation,
            })),
        });

        return {
            success: true,
            message: `${data.questions.length} questions created successfully`,
        };
    }

    /**
     * Update a question
     */
    static async update(id: string, data: UpdateQuestionDTO): Promise<SuccessMessageResponse> {
        const question = await prisma.question.findFirst({
            where: { id, deletedAt: null },
        });

        if (!question) {
            throw new Error("Question not found");
        }

        await prisma.question.update({
            where: { id },
            data: {
                ...data,
                questionType: data.questionType ? (data.questionType) : undefined,
                riskRating: data.riskRating ? (data.riskRating) : undefined,
                options: data.options !== undefined ? (data.options as Option[]) : undefined,
                rtv: data.rtv,
                recommendation: data.recommendation,
            },
        });

        return {
            success: true,
            message: "Question updated successfully",
        };
    }

    /**
     * Delete a question (soft delete)
     */
    static async delete(id: string): Promise<SuccessMessageResponse> {
        const question = await prisma.question.findFirst({
            where: { id, deletedAt: null },
        });

        if (!question) {
            throw new Error("Question not found");
        }

        await prisma.question.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });

        return {
            success: true,
            message: "Question deleted successfully",
        };
    }

    /**
     * Bulk soft delete questions
     */
    static async bulkDelete(data: BulkDeleteQuestionDTO): Promise<SuccessMessageResponse> {
        const count = await prisma.question.count({
            where: {
                id: { in: data.ids },
                deletedAt: null,
            },
        });

        if (count === 0) {
            throw new Error("No questions found for the provided IDs");
        }

        await prisma.question.updateMany({
            where: {
                id: { in: data.ids },
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        return {
            success: true,
            message: `${count} question(s) deleted successfully`,
        };
    }
}
