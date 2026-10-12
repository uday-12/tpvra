/**
 * Email template for when an assessor raises a clarification request.
 * Sent to the vendor.
 */

interface ClarificationRequestData {
    vendorName: string;
    assessorName: string;
    assessmentTitle: string;
    questionText: string;
    clarificationMessage: string;
    dueDate?: string;
    clarificationLink: string;
}

export function clarificationRequestTemplate(data: ClarificationRequestData): { subject: string; html: string } {
    const subject = `Clarification Requested: ${data.assessmentTitle}`;

    const dueDateSection = data.dueDate
        ? `<tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Due Date</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${data.dueDate}</td>
           </tr>`
        : "";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 32px 40px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">Clarification Requested</h1>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hi <strong>${data.vendorName}</strong>,
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                                The assessor <strong>${data.assessorName}</strong> has requested a clarification on the assessment <strong>${data.assessmentTitle}</strong>.
                            </p>

                            <!-- Details Card -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
                                <tr><td style="padding: 20px;">
                                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Assessment</td>
                                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${data.assessmentTitle}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Assessor</td>
                                            <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${data.assessorName}</td>
                                        </tr>
                                        ${dueDateSection}
                                    </table>
                                </td></tr>
                            </table>

                            <!-- Question & Message -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffbeb; border-radius: 8px; border: 1px solid #fde68a; margin-bottom: 28px;">
                                <tr><td style="padding: 20px;">
                                    <p style="color: #92400e; font-size: 13px; font-weight: 600; margin: 0 0 8px; text-transform: uppercase;">Question</p>
                                    <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">${data.questionText}</p>
                                    <p style="color: #92400e; font-size: 13px; font-weight: 600; margin: 0 0 8px; text-transform: uppercase;">Clarification Requested</p>
                                    <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0;">${data.clarificationMessage}</p>
                                </td></tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="${data.clarificationLink}" style="display: inline-block; background: linear-gradient(135deg, #d97706 0%, #b45309 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                                            Respond to Clarification
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                This is an automated notification from the Third-Party Risk Management platform.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    return { subject, html };
}
