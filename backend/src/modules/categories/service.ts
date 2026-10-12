import { prisma } from "@/database/prisma-client";
import type { Prisma } from "@/generated/prisma";
import type {
    ListCategoriesQuery,
    PaginatedCategoryResponse,
    SuccessMessageResponse,
    CreateCategoryDTO,
    UpdateCategoryDTO
} from "./model";

export abstract class CategoryService {
    /**
     * List categories with pagination and search
     */
    static async listCategories(query: ListCategoriesQuery): Promise<PaginatedCategoryResponse> {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const offset = (page - 1) * limit;

        const where: Prisma.CategoryWhereInput = {
            deletedAt: null,
        };

        if (query.searchQuery) {
            where.name = {
                contains: query.searchQuery,
                mode: 'insensitive',
            };
        }

        const totalCount = await prisma.category.count({ where });

        const categories = await prisma.category.findMany({
            where,
            skip: offset,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        questions: {
                            where: {
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
                            }
                        }
                    }
                }
            }
        });

        const totalPages = Math.ceil(totalCount / limit);

        return {
            categories: categories.map(c => ({
                id: c.id,
                name: c.name,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
                questionsCount: c._count.questions
            })),
            totalCount,
            totalPages,
            currentPage: page,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        };
    }

    /**
     * Get category by ID
     */
    static async getById(id: string) {
        const category = await prisma.category.findFirst({
            where: { id, deletedAt: null },
            include: {
                _count: {
                    select: {
                        questions: {
                            where: {
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
                            }
                        }
                    }
                }
            }
        });

        if (!category) return null;

        return {
            id: category.id,
            name: category.name,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
            questionsCount: category._count.questions
        };
    }

    /**
     * Create a new category
     */
    static async create(data: CreateCategoryDTO): Promise<SuccessMessageResponse> {
        await prisma.category.create({
            data: {
                ...data,
            },
        });

        return {
            success: true,
            message: "Category created successfully",
        };
    }

    /**
     * Update a category
     */
    static async update(id: string, data: UpdateCategoryDTO): Promise<SuccessMessageResponse> {
        const category = await prisma.category.findFirst({
            where: { id, deletedAt: null },
        });

        if (!category) {
            throw new Error("Category not found");
        }

        await prisma.category.update({
            where: { id },
            data,
        });

        return {
            success: true,
            message: "Category updated successfully",
        };
    }

    /**
     * Delete a category (soft delete)
     */
    static async delete(id: string): Promise<SuccessMessageResponse> {
        const category = await prisma.category.findFirst({
            where: { id, deletedAt: null },
        });

        if (!category) {
            throw new Error("Category not found");
        }

        const activeQuestionsCount = await prisma.question.count({
            where: {
                categoryId: id,
                deletedAt: null
            }
        });

        if (activeQuestionsCount > 0) {
            throw new Error("Cannot delete category because it has active questions attached to it");
        }

        await prisma.category.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });

        return {
            success: true,
            message: "Category deleted successfully",
        };
    }
}
