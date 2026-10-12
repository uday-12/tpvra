import { prisma } from "@/database/prisma-client";
import { type ListVendorAssessmentsQuery } from "./vendor-model";
import { type Prisma, AssessmentStatus, ClarificationStatus } from "@/generated/prisma";

export abstract class VendorDashboardService {
    static async getVendorStats(vendorId: string) {
        const [pendingAssessments, pendingClarifications] = await Promise.all([
            prisma.assessorVendorAssessment.count({
                where: {
                    vendorId: vendorId,
                    status: AssessmentStatus.PENDING,
                    deletedAt: null
                }
            }),
            prisma.clarification.count({
                where: {
                    vendorId: vendorId,
                    status: ClarificationStatus.PENDING
                }
            })
        ]);

        return {
            pendingAssessments,
            pendingClarifications
        };
    }

    static async listVendorAssessments(vendorId: string, query: ListVendorAssessmentsQuery) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const offset = (page - 1) * limit;

        const where: Prisma.AssessorVendorAssessmentWhereInput = {
            vendorId: vendorId,
            deletedAt: null,
        };

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
            where.parentAssessment = {
                title: {
                    contains: query.searchQuery,
                    mode: 'insensitive',
                }
            };
        }

        const [totalCount, items] = await Promise.all([
            prisma.assessorVendorAssessment.count({ where }),
            prisma.assessorVendorAssessment.findMany({
                where,
                include: {
                    parentAssessment: {
                        select: { title: true }
                    },
                    assessor: {
                        select: { name: true, assessorName: true }
                    },
                    submittedAssessment: {
                        select: {
                            id: true,
                            assessmentQuestions: {
                                select: { id: true }
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
            const questionsSubmitted = item.submittedAssessment?.assessmentQuestions.length ?? 0;
            // Assessor name: try `assessorName` first, then `name`
            const assessorName = item.assessor.assessorName || item.assessor.name;

            return {
                id: item.id,
                status: item.status,
                assessmentName: item.parentAssessment?.title ?? "Unknown Assessment",
                assessorName: assessorName ?? "Unknown Assessor",
                questionsSubmitted: questionsSubmitted,
                overallRisk: item.overallRisk,
                dueDate: item.dueDate,
                submittedAt: item.submittedAt,
                submittedAssessmentId: item.submittedAssessment?.id ?? null
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

    static async getFilterData(vendorId: string) {
        const assignments = await prisma.assessorVendorAssessment.findMany({
            where: {
                vendorId: vendorId,
                deletedAt: null,
            },
            select: {
                parentAssessment: {
                    select: { id: true, title: true }
                }
            }
        });

        const assessmentsMap = new Map<string, { id: string; name: string }>();

        for (const item of assignments) {
            if (item.parentAssessment) {
                assessmentsMap.set(item.parentAssessment.id, {
                    id: item.parentAssessment.id,
                    name: item.parentAssessment.title
                });
            }
        }

        return {
            assessments: Array.from(assessmentsMap.values())
        };
    }
}
