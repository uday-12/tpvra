import { Static } from "@sinclair/typebox";
import { t } from "elysia";

export type RazorpayPayment = Static<typeof RazorpayPayment>;
export const RazorpayPayment = t.Object({
    id: t.String(),
    entity: t.Literal("payment"),
    amount: t.Number(),
    currency: t.String(),
    status: t.Union([
        t.Literal("created"),
        t.Literal("authorized"),
        t.Literal("captured"),
        t.Literal("refunded"),
        t.Literal("failed"),
    ]),
    order_id: t.String(),
    invoice_id: t.Union([t.String(), t.Null()]),
    international: t.Boolean(),
    method: t.String(),
    amount_refunded: t.Number(),
    refund_status: t.Union([t.String(), t.Null()]),
    captured: t.Boolean(),
    description: t.Union([t.String(), t.Null()]),
    card_id: t.Union([t.String(), t.Null()]),
    bank: t.Union([t.String(), t.Null()]),
    wallet: t.Union([t.String(), t.Null()]),
    vpa: t.Union([t.String(), t.Null()]),
    email: t.String(),
    contact: t.String(),
    notes: t.Record(t.String(), t.String()),
    fee: t.Union([t.Number(), t.Null()]),
    tax: t.Union([t.Number(), t.Null()]),
    error_code: t.Union([t.String(), t.Null()]),
    error_description: t.Union([t.String(), t.Null()]),
    error_source: t.Union([t.String(), t.Null()]),
    error_step: t.Union([t.String(), t.Null()]),
    error_reason: t.Union([t.String(), t.Null()]),
    created_at: t.Number(),
    upi: t.Optional(
        t.Object({
            payer_account_type: t.String(),
            vpa: t.String(),
        }),
    ),
    acquirer_data: t.Optional(
        t.Object({
            rrn: t.Optional(t.String()),
        }),
    ),
});

export type RazorpayOrder = Static<typeof RazorpayOrder>;
export const RazorpayOrder = t.Object({
    id: t.String(),
    entity: t.Literal("order"),
    amount: t.Number(),
    amount_paid: t.Number(),
    amount_due: t.Number(),
    currency: t.String(),
    receipt: t.Union([t.String(), t.Null()]),
    status: t.Union([
        t.Literal("created"),
        t.Literal("attempted"),
        t.Literal("paid"),
    ]),
    attempts: t.Number(),
    notes: t.Record(t.String(), t.String()),
    created_at: t.Number(),
    offer_id: t.Optional(t.Union([t.String(), t.Null()])),
});

export type RazorpayRefund = Static<typeof RazorpayRefund>;
export const RazorpayRefund = t.Object({
    id: t.String(),
    entity: t.String(),
    amount: t.Number(),
    currency: t.String(),
    payment_id: t.String(),
    notes: t.Record(t.String(), t.String()),
    receipt: t.Union([t.String(), t.Null()]),
    acquirer_data: t.Optional(
        t.Object({
            rrn: t.Optional(t.String()),
        }),
    ),
    created_at: t.Number(),
    batch_id: t.Union([t.String(), t.Null()]),
    status: t.Union([
        t.Literal("pending"),
        t.Literal("processed"),
        t.Literal("failed"),
    ]),
    speed_processed: t.String(),
    speed_requested: t.String(),
});

export type RazorpayWebhookEventPayload = Static<
    typeof RazorpayWebhookEventPayload
>;
export const RazorpayWebhookEventPayload = t.Object({
    payment: t.Optional(
        t.Object({
            entity: RazorpayPayment,
        }),
    ),
    order: t.Optional(
        t.Object({
            entity: RazorpayOrder,
        }),
    ),
    refund: t.Optional(
        t.Object({
            entity: RazorpayRefund,
        }),
    ),
});

export type RazorpayWebhookEvent = Static<typeof RazorpayWebhookEvent>;
export const RazorpayWebhookEvent = t.Union([
    t.Literal("payment.authorized"),
    t.Literal("payment.captured"),
    t.Literal("payment.failed"),
    t.Literal("order.paid"),
    t.Literal("refund.created"),
    t.Literal("refund.processed"),
]);

export type RazorpayWebhookPayload = Static<typeof RazorpayWebhookPayload>;
export const RazorpayWebhookPayload = t.Object({
    entity: t.String(),
    account_id: t.String(),
    event: RazorpayWebhookEvent,
    contains: t.Array(t.String()),
    payload: RazorpayWebhookEventPayload,
    created_at: t.Number(),
});
