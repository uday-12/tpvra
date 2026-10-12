import { prisma } from "@/database/prisma-client";
import { AssessmentStatus, RiskRating } from "@/generated/prisma";

const RiskMap: Record<RiskRating, number> = {
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4,
    VERY_LOW: 5,
};

export abstract class DashboardService {
    static async getAdminStats() {
        // Assessors Stats
        const [totalAssessors, activeAssessors] = await Promise.all([
            prisma.user.count({
                where: {
                    role: "assessor",
                }
            }),
            prisma.user.count({
                where: {
                    role: "assessor",
                    banned: false
                }
            })
        ]);

        // Vendors Stats
        const [totalVendors, activeVendors] = await Promise.all([
            prisma.user.count({
                where: {
                    role: "vendor",
                }
            }),
            prisma.user.count({
                where: {
                    role: "vendor",
                    banned: false
                }
            })
        ]);

        // AssessorVendorAssessment Stats
        const assessmentStats = await prisma.assessorVendorAssessment.groupBy({
            by: ['status'],
            where: {
                deletedAt: null
            },
            _count: {
                _all: true
            }
        });

        // Initialize counts
        let assignedCount = 0;
        let inProgressCount = 0;
        let submittedCount = 0;
        let totalAssessments = 0;

        assessmentStats.forEach(stat => {
            totalAssessments += stat._count._all;
            if (stat.status === AssessmentStatus.PENDING) {
                assignedCount = stat._count._all;
            } else if (stat.status === AssessmentStatus.IN_PROGRESS) {
                inProgressCount = stat._count._all;
            } else if (stat.status === AssessmentStatus.SUBMITTED) {
                submittedCount = stat._count._all;
            }
        });

        return {
            assessors: {
                total: totalAssessors,
                active: activeAssessors,
                inactive: totalAssessors - activeAssessors
            },
            vendors: {
                total: totalVendors,
                active: activeVendors,
                inactive: totalVendors - activeVendors
            },
            assessments: {
                assigned: assignedCount,
                inProgress: inProgressCount,
                submitted: submittedCount,
                total: totalAssessments
            }
        };
    }

    static async getReviewMetrics(submittedAssessmentId: string) {
        // 1. Fetch AssessorVendorAssessment to get overall score
        const assignment = await prisma.assessorVendorAssessment.findFirst({
            where: {
                submittedAssessmentId: submittedAssessmentId,
                deletedAt: null
            },
            select: {
                overallRisk: true
            }
        });

        // 2. Fetch Questions for this Assessment
        const assessmentQuestions = await prisma.assessmentQuestion.findMany({
            where: {
                assessmentId: submittedAssessmentId,
                deletedAt: null,
            },
            include: {
                question: {
                    select: {
                        id: true,
                        questionText: true,
                        riskRating: true,
                        assignedRiskRating: true,
                        rtv: true,
                        recommendation: true,
                        category: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        // 3. Process Metrics
        const questionMetrics = assessmentQuestions.map(aq => ({
            id: aq.question.id,
            title: aq.question.questionText,
            categoryName: aq.question.category.name,
            defaultRisk: aq.question.riskRating,
            assignedRisk: aq.question.assignedRiskRating,
            rtv: aq.question.rtv,
            recommendation: aq.question.recommendation,
        }));

        // 4. Calculate Risk by Category
        const categoryGroups = new Map<string, number[]>();

        questionMetrics.forEach(q => {
            const risk = q.assignedRisk;
            if (risk) {
                const score = RiskMap[risk];
                if (!categoryGroups.has(q.categoryName)) {
                    categoryGroups.set(q.categoryName, []);
                }
                categoryGroups.get(q.categoryName)!.push(score);
            }
        });

        const riskByCategory = Array.from(categoryGroups.entries()).map(([categoryName, scores]) => {
            const total = scores.reduce((sum, s) => sum + s, 0);
            const avg = total / scores.length;
            return {
                categoryName,
                averageScore: Math.round(avg)
            };
        });

        return {
            overallScore: assignment?.overallRisk ?? null,
            riskByCategory,
            questions: questionMetrics
        };
    }
}
