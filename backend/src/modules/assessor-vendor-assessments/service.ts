import { prisma } from "@/database/prisma-client";
import { Prisma, AssessmentStatus, QuestionType, RiskRating, PaymentStatus } from "@/generated/prisma";
import Razorpay from "razorpay";
import { getPaymentConfig } from "@/config/payment.config";
import { PaymentGateway } from "@/lib/payment-adapter/types";
import {
    CreateAssessorVendorAssessmentDTO,
    ListAssessorVendorAssessmentQuery,
    PaginatedAssessorVendorAssessmentResponse,
    AssessorVendorAssessmentDetailResponse,
    SuccessMessageResponse,
    AssessorVendorAssessmentResponse,
    SubmitAssessmentDTO,
    OrderSummaryResponse,
    CreateOrderResponse,
    VendorAssessmentFilterDataResponse,
    AssessorAssessmentFilterDataResponse,
    SubmittedAssessmentResponse,
    AssessorAssessmentReviewResponse,
    UpdateAssessorVendorAssessmentDTO,
    UpdateQuestionRiskRatingDTO,
} from "./model";
import type { Option } from "../questions/model";
import { PaymentProcessorFactory } from "@/lib/payment-adapter";
import { NotificationService } from "@/modules/notifications/service";


export abstract class AssessorVendorAssessmentService {
    /**
     * Save draft of assessment answers
     */
    static async saveDraft(
        id: string,
        vendorId: string,
        data: SubmitAssessmentDTO
    ): Promise<SuccessMessageResponse> {
        const assessmentAssignment = await prisma.assessorVendorAssessment.findFirst({
            where: { id, vendorId, deletedAt: null },
            include: {
                parentAssessment: {
                    include: {
                        assessmentQuestions: {
                            include: { question: true },
                            orderBy: { createdAt: 'asc' }
                        }
                    }
                },
                submittedAssessment: {
                    include: {
                        assessmentQuestions: {
                            include: { question: true },
                            orderBy: { createdAt: 'asc' }
                        }
                    }
                }
            }
        });

        if (!assessmentAssignment) {
            throw new Error("Assessment not found or unauthorized");
        }

        // Transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
            // Check if submittedAssessmentId exists. If not, clone parent.
            let submittedAssessmentId = assessmentAssignment.submittedAssessmentId;
            let submittedQuestions = assessmentAssignment.submittedAssessment?.assessmentQuestions || [];

            if (!submittedAssessmentId) {
                if (!assessmentAssignment.parentAssessment) {
                    throw new Error("Parent assessment not found");
                }

                // Clone Assessment
                const clonedAssessment = await tx.assessment.create({
                    data: {
                        title: assessmentAssignment.parentAssessment.title,
                        assessmentType: "CLONED",
                        // Link questions
                        assessmentQuestions: {
                            create: assessmentAssignment.parentAssessment.assessmentQuestions.map(aq => ({
                                question: {
                                    create: {
                                        questionText: aq.question.questionText,
                                        questionType: aq.question.questionType,
                                        riskRating: aq.question.riskRating,
                                        options: aq.question.options ?? Prisma.JsonNull,
                                        categoryId: aq.question.categoryId,
                                        rtv: aq.question.rtv,
                                        recommendation: aq.question.recommendation,
                                    }
                                }
                            }))
                        }
                    },
                    include: {
                        assessmentQuestions: {
                            include: { question: true },
                            orderBy: { createdAt: 'asc' }
                        }
                    }
                });

                // submittedAssessmentId = clonedAssessment.id;
                submittedQuestions = clonedAssessment.assessmentQuestions;

                // Update Assignment with submittedAssessmentId
                await tx.assessorVendorAssessment.update({
                    where: { id },
                    data: { submittedAssessmentId: clonedAssessment.id }
                });
            }

            // Build Map: Parent Question ID -> Cloned Question ID
            const questionIdMap = new Map<string, string>();
            const targetQuestions = submittedQuestions;

            const parentQuestions = submittedAssessmentId
                ? assessmentAssignment.submittedAssessment?.assessmentQuestions || []
                : assessmentAssignment.parentAssessment?.assessmentQuestions || [];

            const availableTargetQuestions = [...targetQuestions];

            // Iterate over PARENT questions to map them to TARGET (Cloned) questions
            parentQuestions.forEach((pq) => {
                const pqText = pq.question.questionText;
                const matchIndex = availableTargetQuestions.findIndex(sq => sq.question.questionText === pqText);

                if (matchIndex !== -1) {
                    const match = availableTargetQuestions[matchIndex];
                    questionIdMap.set(pq.questionId, match.questionId);
                    // Remove to prevent reuse
                    availableTargetQuestions.splice(matchIndex, 1);
                }
            });

            for (const answerData of data.answers) {
                let finalAnswer = answerData.answer || "";

                // Handle Multi-Select (ensure array is joined if not handled by client)
                if (answerData.selectedOptions && answerData.selectedOptions.length > 0) {
                    finalAnswer = answerData.selectedOptions.join(',');
                }

                // If FILE_UPLOAD, answer text might be unused or filename
                const fileId = answerData.questionType === QuestionType.FILE_UPLOAD
                    ? (answerData.fileId && answerData.fileId.trim() !== '' ? answerData.fileId : null)
                    : null;

                const targetQuestionId = questionIdMap.get(answerData.questionId) || answerData.questionId;

                // Upsert VendorAnswer

                const vendorAnswer = await tx.vendorAnswer.upsert({
                    where: {
                        vendorId_questionId: {
                            vendorId: vendorId,
                            questionId: targetQuestionId
                        }
                    },
                    update: {
                        answer: finalAnswer,
                        answerExplanation: (answerData.answerExplanation ?? null) as any,
                        answerFileId: fileId,
                        riskRating: RiskRating.LOW,
                        updatedAt: new Date()
                    },
                    create: {
                        vendorId: vendorId,
                        questionId: targetQuestionId,
                        answer: finalAnswer,
                        answerExplanation: (answerData.answerExplanation ?? null) as any,
                        answerFileId: fileId,
                        riskRating: RiskRating.LOW,
                    }
                });

                // Handle Supporting Files (VendorAnswerFile)
                // If supportingFileId is provided (e.g. for text question support evidence)
                if (answerData.supportingFileId && answerData.supportingFileId.trim() !== '') {
                    // Create VendorAnswerFile link
                    // Check if exists? schema unique([vendorAnswerId, fileId])
                    // We'll upsert or ignore if exists

                    const existingFile = await tx.vendorAnswerFile.findUnique({
                        where: {
                            vendorAnswerId_fileId: {
                                vendorAnswerId: vendorAnswer.id,
                                fileId: answerData.supportingFileId
                            }
                        },
                        select: {
                            id: true
                        }
                    });

                    if (!existingFile) {

                        // if any old files exists delete them 
                        await tx.vendorAnswerFile.deleteMany({
                            where: {
                                vendorAnswerId: vendorAnswer.id
                            }
                        });
                        await tx.vendorAnswerFile.create({
                            data: {
                                vendorAnswerId: vendorAnswer.id,
                                fileId: answerData.supportingFileId
                            }
                        });
                    }
                }
            }

            // Update Assessment Status to IN_PROGRESS if PENDING
            if (assessmentAssignment.status === AssessmentStatus.PENDING) {
                await tx.assessorVendorAssessment.update({
                    where: { id },
                    data: { status: AssessmentStatus.IN_PROGRESS, submittedAt: new Date() }
                });
            }
        }, {
            timeout: 20000
        });

        return {
            success: true,
            message: "Draft saved successfully"
        };
    }

    /**
     * Get order summary for assessment
     */
    static async orderSummary(
        id: string,
        vendorId: string
    ): Promise<typeof OrderSummaryResponse.static> {
        const assessmentAssignment = await prisma.assessorVendorAssessment.findFirst({
            where: { id, vendorId },
            include: {
                parentAssessment: true,
                submittedAssessment: true
            }
        });

        if (!assessmentAssignment) {
            throw new Error("Assessment assignment not found");
        }

        const targetAssessment = assessmentAssignment.submittedAssessment || assessmentAssignment.parentAssessment;

        if (!targetAssessment) {
            throw new Error("Assessment details not found");
        }

        const amount = Number(assessmentAssignment.amount ?? 0);

        return {
            amount,
            currency: "USD",
            assessmentId: targetAssessment.id,
            assessmentTitle: targetAssessment.title
        };
    }

    /**
     * Create Razorpay Order
     */
    static async createOrder(
        id: string,
        vendorId: string,
        user: { name: string; email: string; phone?: string | null; }
    ): Promise<typeof CreateOrderResponse.static> {
        const summary = await this.orderSummary(id, vendorId);

        if (summary.amount <= 0) {
            throw new Error("Assessment is free, no payment required");
        }

        const config = getPaymentConfig(PaymentGateway.RAZORPAY);

        const processor = PaymentProcessorFactory.getProcessor(PaymentGateway.RAZORPAY, config);

        // const instance = new Razorpay({
        //     key_id: config.apiKey,
        //     key_secret: config.apiSecret,
        // });



        // Amount in paise
        const amountInPaise = Math.round(summary.amount * 100);

        const options = {
            amount: amountInPaise,
            currency: config.currency || "USD",
            receipt: `receipt_${id}_${Date.now()}`,
            notes: {
                assessmentId: summary.assessmentId,
                vendorId: vendorId,
                assignmentId: id
            }
        };

        const order = await processor.createPaymentIntent(options);

        if (!order.transactionId) {
            throw new Error("Failed to create Razorpay order");
        }

        // Create local Payment record
        await prisma.payment.create({
            data: {
                amount: summary.amount,
                paymentMethod: 'razorpay',
                status: PaymentStatus.PENDING,
                vendorId: vendorId,
                assessmentId: summary.assessmentId,
                transactionId: order.transactionId, // Store Razorpay Order ID for webhook matching
                // assessorId is optional and not applicable for self-payment by vendor usually, 
                // key is logging the transaction.
            }
        });

        return {
            orderId: order.transactionId,
            amount: summary.amount,
            currency: options.currency,
            keyId: config.apiKey,
            vendorName: user.name,
            vendorEmail: user.email,
            ...(user.phone && { vendorPhone: user.phone }),
        };
    }

    /**
     * Create a new assessment assignment
     */
    static async create(data: CreateAssessorVendorAssessmentDTO): Promise<SuccessMessageResponse> {
        const assessor = await prisma.user.findUnique({ where: { id: data.assessorId } });
        const vendor = await prisma.user.findUnique({ where: { id: data.vendorId } });
        const assessment = await prisma.assessment.findUnique({ where: { id: data.assessmentId } });

        if (!assessor || !vendor || !assessment) {
            throw new Error("Assessor, vendor, or assessment not found");
        }

        await prisma.assessorVendorAssessment.create({
            data: {
                assessorId: data.assessorId,
                vendorId: data.vendorId,
                parentAssessmentId: data.assessmentId,
                status: AssessmentStatus.PENDING,
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                amount: data.amount || 0,
            }
        });

        // Send email notifications to vendor and assessor (fire-and-forget)
        NotificationService.assessmentAssigned({
            vendorEmail: vendor.email,
            vendorName: vendor.companyName || vendor.name,
            assessorEmail: assessor.email,
            assessorName: assessor.assessorName || assessor.name,
            assessmentTitle: assessment.title,
            assessmentId: assessment.id,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }).catch(console.error);

        return {
            success: true,
            message: "Assessment assigned successfully",
        };
    }

    /**
     * Update an assessment assignment
     */
    static async update(id: string, data: UpdateAssessorVendorAssessmentDTO): Promise<SuccessMessageResponse> {
        const assignment = await prisma.assessorVendorAssessment.findFirst({
            where: { id, deletedAt: null }
        });

        if (!assignment) {
            throw new Error("Assignment not found");
        }

        // Validate entities if IDs are updated
        if (data.assessorId) {
            const assessor = await prisma.user.findUnique({ where: { id: data.assessorId } });
            if (!assessor) throw new Error("Assessor not found");
        }
        if (data.vendorId) {
            const vendor = await prisma.user.findUnique({ where: { id: data.vendorId } });
            if (!vendor) throw new Error("Vendor not found");
        }
        if (data.assessmentId) {
            const assessment = await prisma.assessment.findUnique({ where: { id: data.assessmentId } });
            if (!assessment) throw new Error("Assessment not found");
        }

        await prisma.assessorVendorAssessment.update({
            where: { id },
            data: {
                ...(data.assessorId && { assessorId: data.assessorId }),
                ...(data.vendorId && { vendorId: data.vendorId }),
                ...(data.assessmentId && { parentAssessmentId: data.assessmentId }),
                ...(data.amount !== undefined && { amount: data.amount }),
                ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
            }
        });

        return {
            success: true,
            message: "Assignment updated successfully"
        };
    }

    /**
     * List assignments with pagination and flexible filters
     */
    static async list(query: ListAssessorVendorAssessmentQuery): Promise<PaginatedAssessorVendorAssessmentResponse> {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const offset = (page - 1) * limit;

        const where: Prisma.AssessorVendorAssessmentWhereInput = {
            deletedAt: null,
        };

        // Handle single filters (backward compatibility) and array filters
        if (query.assessorId) where.assessorId = query.assessorId;
        if (query.vendorId) where.vendorId = query.vendorId;

        // Parse Assessor IDs (string | string[])
        let assessorIds = typeof query.assessorIds === 'string'
            ? query.assessorIds.split(',')
            : Array.isArray(query.assessorIds) ? query.assessorIds : undefined;
        assessorIds = assessorIds?.filter((id) => id !== '');
        if (assessorIds && assessorIds.length > 0) {
            where.assessorId = { in: assessorIds };
        }

        // Parse Vendor IDs (string | string[])
        let vendorIds = typeof query.vendorIds === 'string'
            ? query.vendorIds.split(',')
            : Array.isArray(query.vendorIds) ? query.vendorIds : undefined;
        vendorIds = vendorIds?.filter((id) => id !== '');
        if (vendorIds && vendorIds.length > 0) {
            where.vendorId = { in: vendorIds };
        }

        // Handle Statuses
        let statusFilter: AssessmentStatus[] = [];
        if (query.status) statusFilter.push(query.status as AssessmentStatus);

        const queryStatuses = typeof query.statuses === 'string'
            ? query.statuses.split(',') as AssessmentStatus[]
            : Array.isArray(query.statuses) ? query.statuses : undefined;

        if (queryStatuses && queryStatuses.length > 0) {
            statusFilter = [...new Set([...statusFilter, ...queryStatuses])];
        }

        // Filter out empty strings and ensure unique valid statuses
        statusFilter = statusFilter.filter(s => s && s.trim() !== "") as AssessmentStatus[];

        // Handle FetchBy (Tabs)
        if (query.fetchBy === "pending") {
            statusFilter = [AssessmentStatus.PENDING, AssessmentStatus.IN_PROGRESS];
        } else if (query.fetchBy === "submitted") {
            statusFilter = [AssessmentStatus.SUBMITTED];
        }

        if (statusFilter.length > 0) {
            where.status = { in: statusFilter };
        }

        // Handle Assessment Ids
        let assessmentIds = typeof query.assessmentIds === 'string'
            ? query.assessmentIds.split(',')
            : Array.isArray(query.assessmentIds) ? query.assessmentIds : undefined;
        assessmentIds = assessmentIds?.filter((id) => id !== '');
        if (assessmentIds && assessmentIds.length > 0) {
            // Priority: Submitted > Parent
            // Match if (submittedId IN ids) OR (submittedId IS NULL AND parentId IN ids)
            where.OR = [
                { submittedAssessmentId: { in: assessmentIds } },
                {
                    submittedAssessmentId: null,
                    parentAssessmentId: { in: assessmentIds }
                }
            ];
        }

        // Assessment Name Search
        if (query.assessmentName) {
            where.parentAssessment = {
                title: { contains: query.assessmentName, mode: 'insensitive' }
            };
        }

        const totalCount = await prisma.assessorVendorAssessment.count({ where });

        const assignments = await prisma.assessorVendorAssessment.findMany({
            where,
            skip: offset,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                assessor: { select: { id: true, name: true, email: true } },
                vendor: { select: { id: true, name: true, email: true } },
                parentAssessment: { select: { id: true, title: true } },
            }
        });

        const totalPages = Math.ceil(totalCount / limit);

        const now = new Date();

        return {
            assignments: assignments.map(a => {
                const daysLeft = a.dueDate
                    ? Math.ceil((new Date(a.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                return {
                    id: a.id,
                    assessorId: a.assessorId,
                    vendorId: a.vendorId,
                    parentAssessmentId: a.parentAssessmentId,
                    status: a.status,
                    createdAt: a.createdAt,
                    updatedAt: a.updatedAt,
                    dueDate: a.dueDate,
                    daysLeft: daysLeft,
                    assignedDate: a.createdAt, // Same as createdAt
                    amount: Number(a.amount),
                    assessor: a.assessor,
                    vendor: a.vendor,
                    submittedAssessmentId: a.submittedAssessmentId,
                    parentAssessment: a.parentAssessment ? {
                        id: a.parentAssessment.id,
                        title: a.parentAssessment.title
                    } : undefined,
                };
            }),
            totalCount,
            totalPages,
            currentPage: page,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        }
    }

    /**
     * Get filter data for vendor assessments
     */
    static async getFilterData(vendorId: string, assessmentName?: string): Promise<typeof VendorAssessmentFilterDataResponse.static> {

        const baseWhere: Prisma.AssessorVendorAssessmentWhereInput = {
            vendorId,
            deletedAt: null,
            parentAssessment: assessmentName ? {
                title: { contains: assessmentName, mode: 'insensitive' }
            } : undefined
        };

        const allAssessments = await prisma.assessorVendorAssessment.findMany({
            where: baseWhere,
            select: {
                status: true,
                submittedAssessment: { select: { id: true, title: true } },
                parentAssessment: { select: { id: true, title: true } },
                assessor: {
                    select: {
                        id: true,
                        name: true,
                        assessorName: true
                    }
                }
            }
        });

        const pendingCount = allAssessments.filter(a =>
            a.status === AssessmentStatus.PENDING || a.status === AssessmentStatus.IN_PROGRESS
        ).length;

        const submittedCount = allAssessments.filter(a =>
            a.status === AssessmentStatus.SUBMITTED
        ).length;

        const statusCounts: Record<string, number> = {};
        const assessorCounts: Record<string, { id: string, name: string, count: number }> = {};
        // Assessment Counts: map id -> { id, name, count }
        const assessmentCountMap: Record<string, { id: string, name: string, count: number }> = {};

        for (const a of allAssessments) {
            // Status Counts
            statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;

            // Assessor Counts
            const assessorName = a.assessor.assessorName || a.assessor.name || 'Unknown';
            if (!assessorCounts[a.assessor.id]) {
                assessorCounts[a.assessor.id] = { id: a.assessor.id, name: assessorName, count: 0 };
            }
            assessorCounts[a.assessor.id].count++;

            // Assessment Counts (Priority Logic)
            const effectiveAssessment = a.submittedAssessment || a.parentAssessment;
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
            assessmentCounts: Object.values(assessmentCountMap)
        };
    }

    /**
     * Get filter data for assessor assessments
     */
    static async getAssessorFilterData(assessorId: string, assessmentName?: string): Promise<typeof AssessorAssessmentFilterDataResponse.static> {
        const baseWhere: Prisma.AssessorVendorAssessmentWhereInput = {
            assessorId,
            deletedAt: null,
            parentAssessment: assessmentName ? {
                title: { contains: assessmentName, mode: 'insensitive' }
            } : undefined
        };

        const allAssessments = await prisma.assessorVendorAssessment.findMany({
            where: baseWhere,
            select: {
                status: true,
                submittedAssessment: { select: { id: true, title: true } },
                parentAssessment: { select: { id: true, title: true } },
                vendor: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        const pendingCount = allAssessments.filter(a =>
            a.status === AssessmentStatus.PENDING || a.status === AssessmentStatus.IN_PROGRESS
        ).length;

        const submittedCount = allAssessments.filter(a =>
            a.status === AssessmentStatus.SUBMITTED
        ).length;

        const statusCounts: Record<string, number> = {};
        const vendorCounts: Record<string, { id: string, name: string, count: number }> = {};
        const assessmentCountMap: Record<string, { id: string, name: string, count: number }> = {};

        for (const a of allAssessments) {
            // Status Counts
            statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;

            // Vendor Counts
            if (!vendorCounts[a.vendor.id]) {
                vendorCounts[a.vendor.id] = { id: a.vendor.id, name: a.vendor.name, count: 0 };
            }
            vendorCounts[a.vendor.id].count++;

            // Assessment Counts
            const effectiveAssessment = a.submittedAssessment || a.parentAssessment;
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
            vendorCounts: Object.values(vendorCounts),
            assessmentCounts: Object.values(assessmentCountMap)
        };
    }

    /**
     * Get assignment details including questions
     */
    static async getById(id: string): Promise<AssessorVendorAssessmentDetailResponse | null> {
        const assignment = await prisma.assessorVendorAssessment.findFirst({
            where: { id, deletedAt: null },
            include: {
                parentAssessment: {
                    include: {
                        assessmentQuestions: {
                            include: {
                                question: {
                                    include: {
                                        category: { select: { id: true, name: true } }
                                    }
                                }
                            },
                            orderBy: { createdAt: 'asc' }
                        }
                    }
                }
            }
        });

        if (!assignment) return null;

        return {
            id: assignment.id,
            assessorId: assignment.assessorId,
            vendorId: assignment.vendorId,
            parentAssessmentId: assignment.parentAssessmentId,
            status: assignment.status,
            createdAt: assignment.createdAt,
            updatedAt: assignment.updatedAt,
            dueDate: assignment.dueDate,
            amount: Number(assignment.amount),
            parentAssessment: assignment.parentAssessment ? {
                id: assignment.parentAssessment.id,
                title: assignment.parentAssessment.title,
                questionsCount: assignment.parentAssessment.assessmentQuestions.length,
                questions: assignment.parentAssessment.assessmentQuestions.map(aq => ({
                    ...aq.question,
                    options: aq.question.options as Option[] | null,
                }))
            } : null,
        }
    }

    /**
     * Delete an assignment
     */
    static async delete(id: string): Promise<SuccessMessageResponse> {
        await prisma.assessorVendorAssessment.update({
            where: { id },
            data: { deletedAt: new Date() }
        });

        return {
            success: true,
            message: "Assignment deleted successfully"
        }
    }

    static async getSubmittedResponse(id: string): Promise<typeof SubmittedAssessmentResponse.static | null> {
        const assignment = await prisma.assessorVendorAssessment.findUnique({
            where: { id },
            include: {
                assessor: { select: { id: true, name: true, assessorName: true } },
                submittedAssessment: {
                    include: {
                        assessmentQuestions: {
                            include: { question: true },
                            orderBy: { createdAt: 'asc' }
                        }
                    }
                },
                parentAssessment: {
                    include: {
                        assessmentQuestions: {
                            include: { question: true },
                            orderBy: { createdAt: 'asc' }
                        }
                    }
                }
            }
        });

        if (!assignment) return null;

        const effectiveAssessment = assignment.submittedAssessment || assignment.parentAssessment;
        if (!effectiveAssessment) return null;

        // Fetch answers using parent assessment question IDs (answers are always saved against parent)
        const questions = effectiveAssessment.assessmentQuestions;
        const answers = await prisma.vendorAnswer.findMany({
            where: {
                vendorId: assignment.vendorId,
                questionId: { in: questions.map(aq => aq.questionId) }
            },
            include: {
                vendorAnswerFiles: { include: { file: true } }
            }
        });

        // Collect all file IDs to fetch
        const fileIds = new Set<string>();
        answers.forEach(a => {
            if (a.answerFileId) fileIds.add(a.answerFileId);
        });

        const filesMap: Record<string, { url: string, name: string }> = {};
        if (fileIds.size > 0) {
            const files = await prisma.file.findMany({ where: { id: { in: Array.from(fileIds) } } });
            files.forEach(f => {
                filesMap[f.id] = {
                    url: f.url || f.filePath || '',
                    name: f.fileName
                };
            });
        }

        // Map cloned question IDs to parent question IDs by position
        const mappedQuestions = questions.map(aq => {
            const ans = answers.find(a => a.questionId === aq.questionId);
            const answerFile = ans?.answerFileId ? filesMap[ans.answerFileId] : null;

            const supportFileRel = ans?.vendorAnswerFiles[0]?.file;
            const supportingFile = supportFileRel ? {
                url: supportFileRel.url || supportFileRel.filePath || '',
                name: supportFileRel.fileName
            } : null;

            return {
                questionText: aq.question.questionText,
                answer: ans?.answer || "",
                answerFile: answerFile || null,
                explanation: ans?.answerExplanation || null,
                supportingFile: supportingFile || null,
                riskRating: ans?.riskRating || "LOW"
            };
        });

        return {
            id: assignment.id,
            assessorName: assignment.assessor.assessorName || assignment.assessor.name || "Unknown",
            submittedAt: assignment.submittedAt,
            questions: mappedQuestions
        };
    }

    static async getAssessmentReview(id: string): Promise<typeof AssessorAssessmentReviewResponse.static | null> {
        const assignment = await prisma.assessorVendorAssessment.findUnique({
            where: { id },
            select: {
                id: true,
                vendorId: true,
                submittedAt: true,
                vendor: { select: { name: true, email: true, companyName: true } },
                submittedAssessment: {
                    select: {
                        assessmentQuestions: {
                            select: {
                                questionId: true,
                                question: {
                                    select: {
                                        questionText: true,
                                        questionType: true,
                                        options: true,
                                        assignedRiskRating: true,
                                        createdAt: true,
                                        updatedAt: true,
                                        riskRating: true
                                    }
                                }
                            },
                            orderBy: { createdAt: 'asc' }
                        }
                    }
                },
                parentAssessment: {
                    select: {
                        assessmentQuestions: {
                            select: {
                                questionId: true,
                                question: {
                                    select: {
                                        questionText: true,
                                        questionType: true,
                                        options: true,
                                        assignedRiskRating: true,
                                        createdAt: true,
                                        updatedAt: true,
                                        riskRating: true
                                    }
                                }
                            },
                            orderBy: { createdAt: 'asc' }
                        }
                    }
                }
            }
        });

        if (!assignment) return null;

        const effectiveAssessment = assignment.submittedAssessment || assignment.parentAssessment;
        if (!effectiveAssessment) return null;

        // Fetch answers using parent assessment question IDs (answers are always saved against parent)
        const questions = effectiveAssessment.assessmentQuestions;
        const parentQuestions = effectiveAssessment?.assessmentQuestions || [];

        const answers = await prisma.vendorAnswer.findMany({
            where: {
                vendorId: assignment.vendorId,
                questionId: { in: parentQuestions.map(aq => aq.questionId) }
            },
            select: {
                questionId: true,
                answer: true,
                answerExplanation: true,
                answerFileId: true,
                riskRating: true,
                vendorAnswerFiles: {
                    select: {
                        file: {
                            select: {
                                id: true,
                                url: true,
                                filePath: true,
                                fileName: true,
                                s3Key: true
                            }
                        }
                    }
                }
            }
        });

        // Collect all file IDs to fetch based on answerFileId
        const fileIds = new Set<string>();
        answers.forEach(a => {
            if (a.answerFileId) fileIds.add(a.answerFileId);
        });

        const filesMap: Record<string, { url: string, name: string, id: string }> = {};
        if (fileIds.size > 0) {
            const files = await prisma.file.findMany({
                where: { id: { in: Array.from(fileIds) } },
                select: { id: true, url: true, filePath: true, fileName: true }
            });
            files.forEach(f => {
                filesMap[f.id] = {
                    url: f.url || f.filePath || '',
                    name: f.fileName,
                    id: f.id
                };
            });
        }

        // Map cloned question IDs to parent question IDs by position
        const questionIdMap = new Map<string, string>();
        questions.forEach((q, index) => {
            if (parentQuestions[index]) {
                questionIdMap.set(q.questionId, parentQuestions[index].questionId);
            }
        });

        const mappedQuestions = questions.map(aq => {
            const parentQuestionId = questionIdMap.get(aq.questionId) || aq.questionId;
            const ans = answers.find(a => a.questionId === parentQuestionId);
            const answerFile = ans?.answerFileId ? filesMap[ans.answerFileId] : null;

            const supportFileRel = ans?.vendorAnswerFiles?.[0]?.file;
            const supportingFile = supportFileRel ? {
                url: supportFileRel.url || supportFileRel.filePath || '',
                name: supportFileRel.fileName,
                s3_key: supportFileRel.s3Key,
                id: supportFileRel.id,
            } : null;

            const options = aq.question.options as unknown as Option[] | null;

            return {
                questionId: aq.questionId,
                questionText: aq.question.questionText,
                questionType: aq.question.questionType,
                options: options ?? null,
                answer: ans?.answer || "",
                answerFile: answerFile || null,
                explanation: ans?.answerExplanation || null,
                supportingFile: supportingFile || null,
                riskRating: aq.question.riskRating,
                assignedRiskRating: aq.question.assignedRiskRating || null,
                createdAt: aq.question.createdAt,
                updatedAt: aq.question.updatedAt
            };
        });

        return {
            id: assignment.id,
            vendorName: assignment.vendor.companyName || assignment.vendor.name,
            submittedAt: assignment.submittedAt,
            questions: mappedQuestions
        };
    }



    static async updateQuestionRiskRating(questionId: string, assignedRiskRating: RiskRating): Promise<SuccessMessageResponse> {
        await prisma.question.update({
            where: { id: questionId },
            data: { assignedRiskRating }
        });

        // calculate overral risk rating, based on question id , get the which assessment linked to assessor_vendor_assessments
        const assessment = await prisma.assessmentQuestion.findMany({
            where: { questionId },
            select: {
                assessmentId: true
            }
        });

        if (!assessment) {
            throw new Error("Assessment not found");
        }

        const assessmentId = assessment[0].assessmentId;
        const assessmentQuestions = await prisma.assessmentQuestion.findMany({
            where: { assessmentId },
            select: {
                questionId: true,
                question: {
                    select: {
                        assignedRiskRating: true
                    }
                }
            }
        });

        // Helper to map RiskRating enum to Number for logic if needed, 
        // though we stored Int in DB for overallRisk.
        const RiskMap: Record<RiskRating, number> = {
            CRITICAL: 1,
            HIGH: 2,
            MEDIUM: 3,
            LOW: 4,
            VERY_LOW: 5,
        };

        // now we got assessment questions, now we should calcuate the assessment overal , among all the question which one among have lowest metric will be choosen and added to update the assessment_vendor_assessment table overalscore 
        let currentScore = 6
        assessmentQuestions.forEach((question) => {
            const riskRating = question.question.assignedRiskRating;
            if (!riskRating) return;
            const riskValue = RiskMap[riskRating];
            currentScore = Math.min(currentScore, riskValue);
        });

        // update assessorVendorAssessment table with ovrralrisk score
        await prisma.assessorVendorAssessment.updateMany({
            where: { submittedAssessmentId: assessmentId },
            data: { overallRisk: currentScore }
        });

        return {
            success: true,
            message: "Risk rating updated successfully"
        };
    }
}
