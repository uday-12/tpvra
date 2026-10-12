import { prisma } from "@/database/prisma-client";
import { type ListAssessorAssessmentsQuery } from "./assessor-model";
import type { Prisma } from "@/generated/prisma";
import { RiskRating } from "@/generated/prisma";

// Helper to map RiskRating enum to Number for logic if needed, 
// though we stored Int in DB for overallRisk.
const RiskMap: Record<RiskRating, number> = {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4,
    VERY_LOW: 5,
};

export abstract class AssessorDashboardService {
    static async listAssignedAssessments(assessorId: string, query: ListAssessorAssessmentsQuery) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const offset = (page - 1) * limit;

        const where: Prisma.AssessorVendorAssessmentWhereInput = {
            assessorId: assessorId,
            deletedAt: null,
        };

        if (query.vendorId) {
            where.vendorId = query.vendorId;
        }

        if (query.assessmentId) {
            where.parentAssessmentId = query.assessmentId;
        }

        if (query.risk) {
            // Handle comma-separated risk values
            const riskValues = query.risk.split(',').map(r => Number(r.trim())).filter(r => !isNaN(r));
            if (riskValues.length === 1) {
                where.overallRisk = riskValues[0];
            } else if (riskValues.length > 1) {
                where.overallRisk = { in: riskValues };
            }
        }

        if (query.searchQuery) {
            where.OR = [
                {
                    parentAssessment: {
                        title: {
                            contains: query.searchQuery,
                            mode: 'insensitive',
                        }
                    }
                },
                {
                    vendor: {
                        companyName: {
                            contains: query.searchQuery,
                            mode: 'insensitive',
                        }
                    }
                }
            ];
        }

        const [totalCount, items] = await Promise.all([
            prisma.assessorVendorAssessment.count({ where }),
            prisma.assessorVendorAssessment.findMany({
                where,
                include: {
                    parentAssessment: {
                        select: { title: true }
                    },
                    vendor: {
                        select: { companyName: true, id: true }
                    },
                    submittedAssessment: {
                        select: {
                            id: true,
                            assessmentQuestions: {
                                select: { id: true } // just to count
                            }
                        }
                    }
                },
                skip: offset,
                take: limit,
                orderBy: {
                    updatedAt: 'desc'
                }
            })
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        const data = items.map(item => {
            // submitted questions count from the submitted assessment snapshot
            const questionsSubmitted = item.submittedAssessment?.assessmentQuestions.length ?? 0;

            return {
                id: item.id,
                status: item.status,
                assessmentName: item.parentAssessment?.title ?? "Unknown Assessment",
                submittedAssessmentId: item.submittedAssessment?.id ?? "Unknown Assessment",
                vendorName: item.vendor.companyName ?? "Unknown Vendor",
                vendorId: item.vendor.id,
                questionsSubmitted: questionsSubmitted,
                overallRisk: item.overallRisk,
                dueDate: item.dueDate,
                submittedAt: item.submittedAt
            };
        });

        return {
            data,
            totalCount,
            totalPages,
            currentPage: page,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        };
    }

    static async getFilterData(assessorId: string) {
        const assignments = await prisma.assessorVendorAssessment.findMany({
            where: {
                assessorId: assessorId,
                deletedAt: null,
            },
            select: {
                vendor: {
                    select: { id: true, companyName: true }
                },
                parentAssessment: {
                    select: { id: true, title: true }
                }
            }
        });

        const vendorsMap = new Map<string, { id: string; name: string }>();
        const assessmentsMap = new Map<string, { id: string; name: string }>();

        for (const item of assignments) {
            if (item.vendor) {
                vendorsMap.set(item.vendor.id, {
                    id: item.vendor.id,
                    name: item.vendor.companyName ?? "Deleted Vendor"
                });
            }
            if (item.parentAssessment) {
                assessmentsMap.set(item.parentAssessment.id, {
                    id: item.parentAssessment.id,
                    name: item.parentAssessment.title
                });
            }
        }

        return {
            vendors: Array.from(vendorsMap.values()),
            assessments: Array.from(assessmentsMap.values())
        };
    }
}
