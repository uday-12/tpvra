import { prisma } from "@/database/prisma-client";
import { ClarificationStatus, Prisma } from "@/generated/prisma";
import type { Option } from "../questions/model";
import {
    ListClarificationsQuery,
    PaginatedClarificationResponse,
    ClarificationFilterDataResponse,
    SuccessMessageResponse,
    SubmitClarificationResponseDTO,
    ClarificationDetailResponse,
    CreateClarificationDTO
} from "./model";
import { NotificationService } from "@/modules/notifications/service";

export abstract class ClarificationService {
    /**
     * List clarifications with pagination and filters
     */
    static async list(query: ListClarificationsQuery): Promise<PaginatedClarificationResponse> {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const offset = (page - 1) * limit;

        const where: Prisma.ClarificationWhereInput = {};

        // Handle Vendor Filter
        let vendorIds = typeof query.vendorIds === 'string'
            ? query.vendorIds.split(',').filter(id => id.trim() !== '')
            : Array.isArray(query.vendorIds) ? query.vendorIds : undefined;
        vendorIds = vendorIds?.filter((id) => id !== '');
        if (vendorIds && vendorIds.length > 0) {
            where.vendorId = { in: vendorIds };
        }

        // Handle Status Filter (FetchBy)
        if (query.fetchBy === "pending") {
            where.status = ClarificationStatus.PENDING;
        } else if (query.fetchBy === "submitted") {
            where.status = ClarificationStatus.SUBMITTED;
        }

        // Handle Assessor and Assessment Filters (Requires join on AssessorVendorAssessment)
        // We will construct the where clause for the relation
        const assessmentWhere: Prisma.AssessorVendorAssessmentWhereInput = {};

        let assessorIds = typeof query.assessorIds === 'string'
            ? query.assessorIds.split(',').filter(id => id.trim() !== '')
            : Array.isArray(query.assessorIds) ? query.assessorIds : undefined;
        assessorIds = assessorIds?.filter((id) => id !== '');
        if (assessorIds && assessorIds.length > 0) {
            where.assessorId = { in: assessorIds };
        }

        let assessmentIds = typeof query.assessmentIds === 'string'
            ? query.assessmentIds.split(',').filter(id => id.trim() !== '')
            : Array.isArray(query.assessmentIds) ? query.assessmentIds : undefined;
        assessmentIds = assessmentIds?.filter((id) => id !== '');
        if (assessmentIds && assessmentIds.length > 0) {
            // Check both parent and submitted IDs
            assessmentWhere.OR = [
                { submittedAssessmentId: { in: assessmentIds } },
                {
                    submittedAssessmentId: null,
                    parentAssessmentId: { in: assessmentIds }
                }
            ];
        }

        // Apply relation filter if any criteria exist
        if (Object.keys(assessmentWhere).length > 0) {
            where.assessorVendorAssessment = assessmentWhere;
        }

        const totalCount = await prisma.clarification.count({ where });

        const clarifications = await prisma.clarification.findMany({
            where,
            skip: offset,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                question: { select: { id: true, questionText: true, options: true } },
                clarificationFile: true,
                assessorVendorAssessment: {
                    include: {
                        assessor: { select: { id: true, name: true, assessorName: true } },
                        parentAssessment: { select: { id: true, title: true } },
                        submittedAssessment: { select: { id: true, title: true } }
                    }
                }
            }
        });

        const totalPages = Math.ceil(totalCount / limit);
        const now = new Date();

        if (clarifications.length === 0) {
            return {
                clarifications: [],
                totalCount,
                totalPages,
                currentPage: page,
                hasNextPage: false,
                hasPrevPage: false,
            };
        }

        // Batch fetch vendor answers
        const answerKeys = clarifications.map(c => ({
            vendorId: c.vendorId,
            questionId: c.question.id
        }));

        const answers = await prisma.vendorAnswer.findMany({
            where: {
                OR: answerKeys
            },
            select: {
                vendorId: true,
                questionId: true,
                answer: true,
                answerFileId: true
            }
        });

        // Map answers for quick lookup: "vendorId_questionId" -> { answer, filePath }
        const answerMap = new Map<string, { answer: string, filePath: string | null }>();

        // Collect file IDs to fetch
        const fileIds: string[] = [];
        answers.forEach(a => {
            if (a.answerFileId) fileIds.push(a.answerFileId);
        });

        // Fetch Files if any
        const fileMap = new Map<string, string>();
        if (fileIds.length > 0) {
            const files = await prisma.file.findMany({
                where: { id: { in: fileIds } },
                select: { id: true, url: true, filePath: true }
            });
            files.forEach(f => {
                fileMap.set(f.id, f.url || f.filePath || '');
            });
        }

        answers.forEach(a => {
            const filePath = a.answerFileId ? fileMap.get(a.answerFileId) : null;
            answerMap.set(`${a.vendorId}_${a.questionId}`, {
                answer: a.answer,
                filePath: filePath || null
            });
        });

        return {
            clarifications: clarifications.map(c => {
                const ava = c.assessorVendorAssessment;
                const effectiveAssessment = ava.submittedAssessment || ava.parentAssessment;
                const assessorName = ava.assessor.assessorName || ava.assessor.name || 'Unknown';

                const daysLeft = c.dueDate
                    ? Math.ceil((new Date(c.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                const answer = answerMap.get(`${c.vendorId}_${c.question.id}`) || null;

                return {
                    id: c.id,
                    clarificationRequested: c.clarificationRequested,
                    questionId: c.question.id,
                    questionText: c.question.questionText,
                    questionOptions: (c.question.options as Option[] | null) ?? null,
                    assessmentId: effectiveAssessment?.id || '',
                    assessmentName: effectiveAssessment?.title || 'Unknown Assessment',
                    assessorId: ava.assessor.id,
                    assessorName: assessorName,
                    requestedAt: c.createdAt,
                    dueDate: c.dueDate,
                    daysLeft: daysLeft,
                    status: c.status as ClarificationStatus,
                    submittedAnswer: answer?.answer || null,
                    submittedAnswerFilePath: answer?.filePath || null,
                    clarificationAnswer: c.clarificationAnswer || null,
                    clarificationFile: c.clarificationFile ? {
                        url: c.clarificationFile.url || c.clarificationFile.filePath || '',
                        name: c.clarificationFile.fileName
                    } : null
                };
            }),
            totalCount,
            totalPages,
            currentPage: page,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        };
    }




    /**
     * Get clarification details including original answer
     */
    static async getDetails(id: string): Promise<typeof ClarificationDetailResponse.static | null> {
        const clarification = await prisma.clarification.findUnique({
            where: { id },
            include: {
                question: true,
                clarificationFile: true
            }
        });

        if (!clarification) return null;

        // Fetch original answer
        const vendorAnswer = await prisma.vendorAnswer.findUnique({
            where: {
                vendorId_questionId: {
                    vendorId: clarification.vendorId,
                    questionId: clarification.questionId
                }
            }
        });

        return {
            id: clarification.id,
            questionText: clarification.question.questionText,
            originalAnswer: vendorAnswer?.answer || null,
            clarificationRequested: clarification.clarificationRequested,
            clarificationAnswer: clarification.clarificationAnswer,
            clarificationFile: clarification.clarificationFile ? {
                id: clarification.clarificationFile.id,
                name: clarification.clarificationFile.fileName,
                url: clarification.clarificationFile.url || clarification.clarificationFile.filePath || ''
            } : null
        };
    }

    /**
     * Subtract... no, Submit response...
     * Submit response to a clarification
     */
    static async submitResponse(
        id: string,
        vendorId: string,
        data: SubmitClarificationResponseDTO
    ): Promise<SuccessMessageResponse> {
        const targetClarification = await prisma.clarification.findUnique({
            where: { id }
        });

        if (!targetClarification) {
            throw new Error("Clarification request not found");
        }

        if (targetClarification.vendorId !== vendorId) {
            throw new Error("Unauthorized: You can only respond to clarifications assigned to you");
        }

        await prisma.clarification.update({
            where: { id },
            data: {
                clarificationAnswer: data.response,
                clarificationFileId: data.fileId || null,
                status: ClarificationStatus.SUBMITTED,
                updatedAt: new Date()
            }
        });

        // Send email notification to assessor (fire-and-forget)
        if (targetClarification.assessorId) {
            const [assessor, vendor, question, assignment] = await Promise.all([
                prisma.user.findUnique({ where: { id: targetClarification.assessorId }, select: { email: true, name: true, assessorName: true } }),
                prisma.user.findUnique({ where: { id: vendorId }, select: { name: true, companyName: true } }),
                prisma.question.findUnique({ where: { id: targetClarification.questionId }, select: { questionText: true } }),
                prisma.assessorVendorAssessment.findUnique({
                    where: { id: targetClarification.assessorVendorAssessmentId },
                    select: { parentAssessment: { select: { title: true } } }
                }),
            ]);

            if (assessor && vendor && question) {
                NotificationService.clarificationResponseSubmitted({
                    assessorEmail: assessor.email,
                    assessorName: assessor.assessorName || assessor.name,
                    vendorName: vendor.companyName || vendor.name,
                    assessmentTitle: assignment?.parentAssessment?.title || "Assessment",
                    questionText: question.questionText,
                    clarificationId: id,
                }).catch(console.error);
            }
        }

        return {
            success: true,
            message: "Response submitted successfully"
        };
    }

    /**
     * Get filter data for clarifications
     */
    static async getFilterData(filters: { vendorId?: string, assessorId?: string, assessmentName?: string }): Promise<typeof ClarificationFilterDataResponse.static> {
        const { vendorId, assessorId, assessmentName } = filters;
        const where: Prisma.ClarificationWhereInput = {};

        if (vendorId) {
            where.vendorId = vendorId;
        }
        if (assessorId) {
            where.assessorId = assessorId;
        }

        if (assessmentName) {
            where.assessorVendorAssessment = {
                submittedAssessment: {
                    title: { contains: assessmentName, mode: 'insensitive' }
                }
            };
        }

        const clarifications = await prisma.clarification.findMany({
            where,
            include: {
                vendor: { select: { id: true, name: true, companyName: true } },
                assessorVendorAssessment: {
                    select: {
                        assessor: { select: { id: true, name: true, assessorName: true } },
                        parentAssessment: { select: { id: true, title: true } },
                        submittedAssessment: { select: { id: true, title: true } }
                    }
                }
            }
        });

        const pendingCount = clarifications.filter(c => c.status === ClarificationStatus.PENDING).length;
        const submittedCount = clarifications.filter(c => c.status === ClarificationStatus.SUBMITTED).length;

        const statusCounts: Record<string, number> = {};
        const assessorCounts: Record<string, { id: string, name: string, count: number }> = {};
        const vendorCounts: Record<string, { id: string, name: string, count: number }> = {};
        const assessmentCountMap: Record<string, { id: string, name: string, count: number }> = {};

        for (const c of clarifications) {
            // Status counts
            statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;

            const ava = c.assessorVendorAssessment;

            // Assessor counts
            const assessorName = ava.assessor.assessorName || ava.assessor.name || 'Unknown';
            if (!assessorCounts[ava.assessor.id]) {
                assessorCounts[ava.assessor.id] = { id: ava.assessor.id, name: assessorName, count: 0 };
            }
            assessorCounts[ava.assessor.id].count++;

            // Vendor counts
            const vendorName = c.vendor.companyName || c.vendor.name || 'Unknown';
            if (!vendorCounts[c.vendorId]) {
                vendorCounts[c.vendorId] = { id: c.vendorId, name: vendorName, count: 0 };
            }
            vendorCounts[c.vendorId].count++;

            // Assessment counts
            const effectiveAssessment = ava.submittedAssessment || ava.parentAssessment;
            if (effectiveAssessment) {
                if (!assessmentCountMap[effectiveAssessment.id]) {
                    assessmentCountMap[effectiveAssessment.id] = {
                        id: effectiveAssessment.id,
                        name: effectiveAssessment.title,
                        count: 0
                    };
                }
                assessmentCountMap[effectiveAssessment.id].count++;
            }
        }

        return {
            pendingCount,
            submittedCount,
            statusCounts: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
            assessorCounts: Object.values(assessorCounts),
            vendorCounts: Object.values(vendorCounts),
            assessmentCounts: Object.values(assessmentCountMap)
        };
    }

    static async createRequest(assessorId: string, data: CreateClarificationDTO): Promise<SuccessMessageResponse> {
        // Validation: Verify assignment belongs to assessor
        const assignment = await prisma.assessorVendorAssessment.findUnique({
            where: { id: data.assessorVendorAssessmentId },
            select: {
                id: true,
                assessorId: true,
                vendorId: true,
                parentAssessment: { select: { title: true } }
            }
        });

        if (!assignment) {
            throw new Error("Assessment assignment not found");
        }

        if (assignment.assessorId !== assessorId) {
            throw new Error("Unauthorized: You can only request clarifications for your assignments");
        }

        // Create Clarification
        const clarification = await prisma.clarification.create({
            data: {
                assessorVendorAssessmentId: data.assessorVendorAssessmentId,
                questionId: data.questionId,
                vendorId: assignment.vendorId, // Inherited from assignment
                assessorId: assessorId, // Explicitly set
                clarificationRequested: data.clarificationRequested,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                status: ClarificationStatus.PENDING,
            }
        });

        // Send email notification to vendor (fire-and-forget)
        const [assessor, vendor, question] = await Promise.all([
            prisma.user.findUnique({ where: { id: assessorId }, select: { name: true, assessorName: true } }),
            prisma.user.findUnique({ where: { id: assignment.vendorId }, select: { email: true, name: true, companyName: true } }),
            prisma.question.findUnique({ where: { id: data.questionId }, select: { questionText: true } }),
        ]);

        if (assessor && vendor && question) {
            NotificationService.clarificationRequested({
                vendorEmail: vendor.email,
                vendorName: vendor.companyName || vendor.name,
                assessorName: assessor.assessorName || assessor.name,
                assessmentTitle: assignment.parentAssessment?.title || "Assessment",
                questionText: question.questionText,
                clarificationMessage: data.clarificationRequested,
                clarificationId: clarification.id,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
            }).catch(console.error);
        }

        return {
            success: true,
            message: "Clarification request created successfully"
        };
    }
}
