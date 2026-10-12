
import { prisma } from "@/database/prisma-client";
import { PaymentStatus, AssessmentStatus, PaymentLog } from "@/generated/prisma";
import { PaymentProcessorFactory } from "@/lib/payment-adapter";
import { PaymentGateway } from "@/lib/payment-adapter/types";
import { getPaymentConfig } from "@/config/payment.config";
import { NotificationService } from "@/modules/notifications/service";

export class PaymentService {
    /**
     * Handle Razorpay Webhook
     */
    static async handleRazorpayWebhook(payload: any, signature: string) {
        const config = getPaymentConfig(PaymentGateway.RAZORPAY);
        const processor = PaymentProcessorFactory.getProcessor(PaymentGateway.RAZORPAY, config);

        // Verify Signature
        const verification = await processor.verifyWebhookEvent(payload, signature);
        if (!verification.success) {
            throw new Error(verification.error?.message || "Invalid webhook signature");
        }

        const event = payload.event;
        const razorpayPaymentEntity = payload.payload?.payment?.entity;
        const razorpayPaymentId = razorpayPaymentEntity?.id;
        const razorpayOrderId = razorpayPaymentEntity?.order_id;
        const razorpayPaymentMethod = razorpayPaymentEntity?.method;

        if (!razorpayOrderId) {
            console.warn("Webhook event missing order_id, skipping processing for our system linkage", event);
            return { received: true };
        }

        // Find Payment Record
        const paymentRecord = await prisma.payment.findFirst({
            where: { transactionId: razorpayOrderId },
            include: { assessment: true }
        });

        if (!paymentRecord) {
            console.error(`Payment record not found for transactionId: ${razorpayOrderId}`);
            // We return success to Razorpay to avoid retries for orders not in our system (or maybe mismatch)
            return { received: true };
        }

        // Log the event
        await prisma.paymentLog.create({
            data: {
                paymentId: paymentRecord.id,
                gateway: "razorpay",
                event: event,
                payload: payload as any
            }
        });

        // Handle Events
        if (event === "payment.authorized") {
            // Step 1: Capture the payment
            const totalAmountInSmallestUnit = Math.round(Number(paymentRecord.amount) * 100);
            const captureResult = await processor.capturePayment(
                razorpayPaymentId,
                totalAmountInSmallestUnit,
                "USD"
            );

            if (!captureResult.success) {
                console.error(`Failed to capture payment ${razorpayPaymentId}:`, captureResult.error);
                // Still update status to reflect the issue
                await prisma.payment.update({
                    where: { id: paymentRecord.id },
                    data: { status: PaymentStatus.FAILED }
                });
                return { status: "capture_failed" };
            }

            // Step 2: Fetch invoice details from Razorpay
            let invoiceId: string | null = null;
            let invoiceUrl: string | null = null;

            try {
                const invoiceResult = await processor.fetchInvoice(razorpayPaymentId);
                if (invoiceResult.success && invoiceResult.data) {
                    invoiceId = invoiceResult.data.invoiceId || null;
                    invoiceUrl = invoiceResult.data.invoiceUrl || null;
                }
            } catch (err) {
                console.warn(`Could not fetch invoice for payment ${razorpayPaymentId}:`, err);
            }

            // Step 3: Update Payment Status with invoice details and payment method
            await prisma.payment.update({
                where: { id: paymentRecord.id },
                data: {
                    status: PaymentStatus.COMPLETED,
                    invoiceId: invoiceId,
                    invoiceUrl: invoiceUrl,
                    ...(razorpayPaymentMethod ? { paymentMethod: razorpayPaymentMethod } : {}),
                }
            });

            // Step 4: Update Assessment Status
            if (paymentRecord.status !== PaymentStatus.COMPLETED) {
                const assignment = await prisma.assessorVendorAssessment.findFirst({
                    where: {
                        vendorId: paymentRecord.vendorId,
                        OR: [
                            { submittedAssessmentId: paymentRecord.assessmentId },
                            { parentAssessmentId: paymentRecord.assessmentId, submittedAssessmentId: null }
                        ]
                    }
                });

                if (assignment) {
                    await prisma.assessorVendorAssessment.update({
                        where: { id: assignment.id },
                        data: {
                            status: AssessmentStatus.SUBMITTED,
                            submittedAt: new Date()
                        }
                    });

                    // Send email notification to assessor (fire-and-forget)
                    const [assessor, vendor] = await Promise.all([
                        prisma.user.findUnique({ where: { id: assignment.assessorId }, select: { email: true, name: true, assessorName: true } }),
                        prisma.user.findUnique({ where: { id: assignment.vendorId }, select: { name: true, companyName: true } }),
                    ]);

                    if (assessor && vendor) {
                        NotificationService.assessmentSubmitted({
                            assessorEmail: assessor.email,
                            assessorName: assessor.assessorName || assessor.name,
                            vendorName: vendor.companyName || vendor.name,
                            assessmentTitle: paymentRecord.assessment.title,
                            assessmentId: paymentRecord.assessmentId,
                        }).catch(console.error);
                    }
                } else {
                    console.warn(`Assignment not found for payment ${paymentRecord.id}`);
                }
            }
        } else if (event === "payment.captured") {
            // Payment already captured (could be auto-capture or our capture confirmation)
            // Ensure status is COMPLETED and fetch invoice if not yet stored
            if (paymentRecord.status !== PaymentStatus.COMPLETED) {
                let invoiceId: string | null = null;
                let invoiceUrl: string | null = null;

                try {
                    const invoiceResult = await processor.fetchInvoice(razorpayPaymentId);
                    if (invoiceResult.success && invoiceResult.data) {
                        invoiceId = invoiceResult.data.invoiceId || null;
                        invoiceUrl = invoiceResult.data.invoiceUrl || null;
                    }
                } catch (err) {
                    console.warn(`Could not fetch invoice for payment ${razorpayPaymentId}:`, err);
                }

                await prisma.payment.update({
                    where: { id: paymentRecord.id },
                    data: {
                        status: PaymentStatus.COMPLETED,
                        invoiceId: invoiceId,
                        invoiceUrl: invoiceUrl,
                        ...(razorpayPaymentMethod ? { paymentMethod: razorpayPaymentMethod } : {}),
                    }
                });
            }
        } else if (event === "payment.failed") {
            await prisma.payment.update({
                where: { id: paymentRecord.id },
                data: { status: PaymentStatus.FAILED }
            });
        }

        return { status: "ok" };
    }

    /**
     * List Payments — Admin sees all, Vendor sees only their own
     * Supports filtering by vendorId[], assessorId[], assessmentId[], paidDateFrom, paidDateTo
     */
    static async listPayments(
        userId: string,
        role: string,
        query: {
            page?: number;
            limit?: number;
            vendorId?: string | string[];
            assessorId?: string | string[];
            assessmentId?: string | string[];
            paidDate?: string;
            paymentMethod?: string;
        }
    ) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};

        // Role-based scoping: vendors can only see their own payments
        if (role === "vendor") {
            where.vendorId = userId;
        } else if (query.vendorId) {
            const vendorIds = Array.isArray(query.vendorId) ? query.vendorId : [query.vendorId];
            if (vendorIds.length > 0) {
                where.vendorId = { in: vendorIds };
            }
        }

        // Assessor filter
        if (query.assessorId) {
            const assessorIds = Array.isArray(query.assessorId) ? query.assessorId : [query.assessorId];
            if (assessorIds.length > 0) {
                where.assessorId = { in: assessorIds };
            }
        }

        // Assessment filter
        if (query.assessmentId) {
            const assessmentIds = Array.isArray(query.assessmentId) ? query.assessmentId : [query.assessmentId];
            if (assessmentIds.length > 0) {
                where.assessmentId = { in: assessmentIds };
            }
        }

        // Date filter on createdAt (paid date) — filters for the entire day
        if (query.paidDate) {
            const startOfDay = new Date(query.paidDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(query.paidDate);
            endOfDay.setHours(23, 59, 59, 999);
            where.createdAt = { gte: startOfDay, lte: endOfDay };
        }

        // Payment method filter
        if (query.paymentMethod) {
            where.paymentMethod = query.paymentMethod;
        }

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: {
                    vendor: { select: { companyName: true, name: true } },
                    assessor: { select: { assessorName: true, name: true } },
                    assessment: { select: { title: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.payment.count({ where }),
        ]);

        const data = payments.map((p) => ({
            id: p.id,
            vendorName: p.vendor.companyName ?? p.vendor.name,
            assessorName: p.assessor?.assessorName ?? p.assessor?.name ?? "",
            assessmentName: p.assessment.title,
            amount: p.amount.toString(),
            date: p.createdAt.toISOString(),
            status: p.status,
            paymentMethod: p.paymentMethod ?? "",
            invoiceUrl: p.invoiceUrl ?? "",
        }));

        return { data, total, page, limit };
    }

    /**
     * Get available filter options for payments
     * Returns distinct vendors, assessors, and assessments that have payments
     */
    static async getPaymentFilters(userId: string, role: string) {
        const baseWhere: any = role === "vendor" ? { vendorId: userId } : {};

        // Get distinct vendor IDs from payments
        const vendorPayments = await prisma.payment.findMany({
            where: baseWhere,
            select: { vendorId: true },
            distinct: ["vendorId"],
        });
        const vendorIds = vendorPayments.map((p) => p.vendorId);

        // Get distinct assessor IDs from payments
        const assessorPayments = await prisma.payment.findMany({
            where: { ...baseWhere, assessorId: { not: null } },
            select: { assessorId: true },
            distinct: ["assessorId"],
        });
        const assessorIds = assessorPayments.map((p) => p.assessorId).filter(Boolean) as string[];

        // Get distinct assessment IDs from payments
        const assessmentPayments = await prisma.payment.findMany({
            where: baseWhere,
            select: { assessmentId: true },
            distinct: ["assessmentId"],
        });
        const assessmentIds = assessmentPayments.map((p) => p.assessmentId);

        // Fetch names in parallel
        const [vendors, assessors, assessments] = await Promise.all([
            prisma.user.findMany({
                where: { id: { in: vendorIds } },
                select: { id: true, companyName: true, name: true },
            }),
            prisma.user.findMany({
                where: { id: { in: assessorIds } },
                select: { id: true, assessorName: true, name: true },
            }),
            prisma.assessment.findMany({
                where: { id: { in: assessmentIds } },
                select: { id: true, title: true },
            }),
        ]);

        // Get distinct payment methods from payments
        const methodPayments = await prisma.payment.findMany({
            where: baseWhere,
            select: { paymentMethod: true },
            distinct: ["paymentMethod"],
        });
        const paymentMethods = methodPayments
            .map((p) => p.paymentMethod)
            .filter(Boolean) as string[];

        return {
            vendors: vendors.map((v) => ({ id: v.id, name: v.companyName ?? v.name })),
            assessors: assessors.map((a) => ({ id: a.id, name: a.assessorName ?? a.name })),
            assessments: assessments.map((a) => ({ id: a.id, name: a.title })),
            paymentMethods,
        };
    }
}
