import { sendEmail } from "@/lib/mailer";
import { assessmentAssignedTemplate } from "./templates/assessment-assigned";
import { assessmentSubmittedTemplate } from "./templates/assessment-submitted";
import { clarificationRequestTemplate } from "./templates/clarification-request";
import { clarificationResponseTemplate } from "./templates/clarification-response";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

/**
 * Notification service for sending email notifications
 * at key workflow events in the TPRM platform.
 *
 * All methods are fire-and-forget — they log errors
 * but never throw, so email failures don't break
 * the main business flow.
 */
export abstract class NotificationService {
    /**
     * Send email to vendor and assessor when an assessment is assigned.
     */
    static async assessmentAssigned(params: {
        vendorEmail: string;
        vendorName: string;
        assessorEmail: string;
        assessorName: string;
        assessmentTitle: string;
        assessmentId: string;
        dueDate?: Date | null;
    }): Promise<void> {
        const assessmentLink = `${APP_URL}/assessments`;
        const dueDateStr = params.dueDate
            ? new Date(params.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
            : undefined;

        // Email to vendor
        const vendorEmail = assessmentAssignedTemplate({
            recipientName: params.vendorName,
            assessmentTitle: params.assessmentTitle,
            vendorName: params.vendorName,
            assessorName: params.assessorName,
            dueDate: dueDateStr,
            assessmentLink,
        });

        // Email to assessor
        const assessorEmail = assessmentAssignedTemplate({
            recipientName: params.assessorName,
            assessmentTitle: params.assessmentTitle,
            vendorName: params.vendorName,
            assessorName: params.assessorName,
            dueDate: dueDateStr,
            assessmentLink,
        });

        try {
            await Promise.all([
                sendEmail(params.vendorEmail, vendorEmail.subject, vendorEmail.html),
                sendEmail(params.assessorEmail, assessorEmail.subject, assessorEmail.html),
            ]);
            console.log(`[Notification] Assessment assigned emails sent for: ${params.assessmentTitle}`);
        } catch (error) {
            console.error("[Notification] Failed to send assessment assigned emails:", error);
        }
    }

    /**
     * Send email to assessor when a vendor submits an assessment.
     */
    static async assessmentSubmitted(params: {
        assessorEmail: string;
        assessorName: string;
        vendorName: string;
        assessmentTitle: string;
        assessmentId: string;
    }): Promise<void> {
        const assessmentLink = `${APP_URL}/assessments`;

        const email = assessmentSubmittedTemplate({
            assessorName: params.assessorName,
            vendorName: params.vendorName,
            assessmentTitle: params.assessmentTitle,
            assessmentLink,
        });

        try {
            await sendEmail(params.assessorEmail, email.subject, email.html);
            console.log(`[Notification] Assessment submitted email sent to assessor for: ${params.assessmentTitle}`);
        } catch (error) {
            console.error("[Notification] Failed to send assessment submitted email:", error);
        }
    }

    /**
     * Send email to vendor when an assessor raises a clarification request.
     */
    static async clarificationRequested(params: {
        vendorEmail: string;
        vendorName: string;
        assessorName: string;
        assessmentTitle: string;
        questionText: string;
        clarificationMessage: string;
        clarificationId: string;
        dueDate?: Date | null;
    }): Promise<void> {
        const clarificationLink = `${APP_URL}/clarifications`;
        const dueDateStr = params.dueDate
            ? new Date(params.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
            : undefined;

        const email = clarificationRequestTemplate({
            vendorName: params.vendorName,
            assessorName: params.assessorName,
            assessmentTitle: params.assessmentTitle,
            questionText: params.questionText,
            clarificationMessage: params.clarificationMessage,
            dueDate: dueDateStr,
            clarificationLink,
        });

        try {
            await sendEmail(params.vendorEmail, email.subject, email.html);
            console.log(`[Notification] Clarification request email sent to vendor for: ${params.assessmentTitle}`);
        } catch (error) {
            console.error("[Notification] Failed to send clarification request email:", error);
        }
    }

    /**
     * Send email to assessor when a vendor submits a clarification response.
     */
    static async clarificationResponseSubmitted(params: {
        assessorEmail: string;
        assessorName: string;
        vendorName: string;
        assessmentTitle: string;
        questionText: string;
        clarificationId: string;
    }): Promise<void> {
        const clarificationLink = `${APP_URL}/clarifications`;

        const email = clarificationResponseTemplate({
            assessorName: params.assessorName,
            vendorName: params.vendorName,
            assessmentTitle: params.assessmentTitle,
            questionText: params.questionText,
            clarificationLink,
        });

        try {
            await sendEmail(params.assessorEmail, email.subject, email.html);
            console.log(`[Notification] Clarification response email sent to assessor for: ${params.assessmentTitle}`);
        } catch (error) {
            console.error("[Notification] Failed to send clarification response email:", error);
        }
    }
}
