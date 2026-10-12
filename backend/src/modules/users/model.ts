import { t } from "elysia";

// --- RESPONSE SCHEMAS ---

export const SuccessMessageResponse = t.Object({
    success: t.Boolean(),
    message: t.String(),
});

export type SuccessMessageResponse = typeof SuccessMessageResponse.static;
