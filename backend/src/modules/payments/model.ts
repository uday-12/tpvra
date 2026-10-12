
import { t } from "elysia";

// We can define a loose schema for the webhook payload since it comes from Razorpay
// and verifying every field might be overkill, but structural validation is good.
export const RazorpayWebhookPayload = t.Object({
    entity: t.String(),
    account_id: t.String(),
    event: t.String(),
    contains: t.Array(t.String()),
    payload: t.Any(), // Deeply nested structure, keeping it flexible for now
    created_at: t.Number(),
});

export type RazorpayWebhookPayload = typeof RazorpayWebhookPayload.static;

export const WebhookSuccessResponse = t.Object({
    status: t.String(),
});

export type WebhookSuccessResponse = typeof WebhookSuccessResponse.static;

export const PaymentListItem = t.Object({
    id: t.String(),
    vendorName: t.String(),
    assessorName: t.String(),
    assessmentName: t.String(),
    amount: t.String(),
    date: t.String(),
    status: t.String(),
    paymentMethod: t.String(),
    invoiceUrl: t.String(),
});

export type PaymentListItem = typeof PaymentListItem.static;

export const PaymentListQuery = t.Object({
    page: t.Optional(t.String()),
    limit: t.Optional(t.String()),
    vendorId: t.Optional(t.Union([t.String(), t.Array(t.String())])),
    assessorId: t.Optional(t.Union([t.String(), t.Array(t.String())])),
    assessmentId: t.Optional(t.Union([t.String(), t.Array(t.String())])),
    paidDate: t.Optional(t.String()),
    paymentMethod: t.Optional(t.String()),
});

export type PaymentListQuery = typeof PaymentListQuery.static;

export const PaginatedPaymentListResponse = t.Object({
    data: t.Array(PaymentListItem),
    total: t.Number(),
    page: t.Number(),
    limit: t.Number(),
});

export type PaginatedPaymentListResponse = typeof PaginatedPaymentListResponse.static;

// Filter option items
const FilterOption = t.Object({
    id: t.String(),
    name: t.String(),
});

export const PaymentFiltersResponse = t.Object({
    vendors: t.Array(FilterOption),
    assessors: t.Array(FilterOption),
    assessments: t.Array(FilterOption),
    paymentMethods: t.Array(t.String()),
});

export type PaymentFiltersResponse = typeof PaymentFiltersResponse.static;
