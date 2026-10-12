
import { Elysia, t } from "elysia";
import { PaymentService } from "./service";
import { RazorpayWebhookPayload, WebhookSuccessResponse, PaymentListQuery, PaginatedPaymentListResponse, PaymentFiltersResponse } from "./model";
import { Auth } from "../auth";
import { auth } from "@/lib/auth";

export const PaymentAPIs = new Elysia({ name: "PaymentAPIs" })
    .use(Auth)
    .get("/payments", async ({ query: { page, limit, vendorId, assessorId, assessmentId, paidDate, paymentMethod }, user }) => {
        const hasPermission = await auth.api.userHasPermission({
            body: {
                userId: user.id,
                permissions: {
                    payment: ["read"],
                },
            },
        });

        if (!hasPermission.success) {
            throw new Error("Unauthorized");
        }

        return await PaymentService.listPayments(user.id, user.role ?? "", {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
            vendorId,
            assessorId,
            assessmentId,
            paidDate,
            paymentMethod,
        });
    }, {
        query: PaymentListQuery,
        response: { "200": PaginatedPaymentListResponse },
        detail: {
            summary: "List Payments",
            description: "Admin sees all payments sorted by recent. Vendor sees only their own payments. Supports filtering by vendorId, assessorId, assessmentId, and date range.",
            tags: ["Payments"],
        },
        auth: true,
    })
    .get("/payments/filters", async ({ user }) => {
        const hasPermission = await auth.api.userHasPermission({
            body: {
                userId: user.id,
                permissions: {
                    payment: ["read"],
                },
            },
        });

        if (!hasPermission.success) {
            throw new Error("Unauthorized");
        }

        return await PaymentService.getPaymentFilters(user.id, user.role ?? "");
    }, {
        response: { "200": PaymentFiltersResponse },
        detail: {
            summary: "Get Payment Filter Options",
            description: "Returns available vendors, assessors, and assessments for payment filtering.",
            tags: ["Payments"],
        },
        auth: true,
    })
    .group("/webhooks", (app) =>
        app.post("/razorpay", async ({ body, headers, set }) => {
            try {
                const signature = headers["x-razorpay-signature"];

                if (!signature) {
                    set.status = 400;
                    return { error: "Missing signature" };
                }

                await PaymentService.handleRazorpayWebhook(body, signature);

                return { status: "ok" };
            } catch (error: any) {
                console.error("Razorpay webhook error:", error);
                set.status = 400;
                return { error: error.message };
            }
        }, {
            body: t.Any(), // Using t.Any() because Razorpay payload can be complex, but ideally use RazorpayWebhookPayload
            detail: {
                summary: "Handle Razorpay Webhooks",
                description: "Public endpoint to receive payment status updates from Razorpay",
                tags: ['Payments'],
            }
        })
    );
