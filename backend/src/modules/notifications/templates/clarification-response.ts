/**
 * Email template for when a vendor submits a clarification response.
 * Sent to the assessor.
 */

interface ClarificationResponseData {
    assessorName: string;
    vendorName: string;
    assessmentTitle: string;
    questionText: string;
    clarificationLink: string;
}

export function clarificationResponseTemplate(data: ClarificationResponseData): { subject: string; html: string } {
    const subject = `Clarification Response Received: ${data.assessmentTitle}`;

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
                        <td style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 32px 40px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">Clarification Response Received</h1>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Hi <strong>${data.assessorName}</strong>,
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                                <strong>${data.vendorName}</strong> has responded to your clarification request on the assessment <strong>${data.assessmentTitle}</strong>.
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
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Responded By</td>
                                            <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${data.vendorName}</td>
                                        </tr>
                                    </table>
                                </td></tr>
                            </table>

                            <!-- Question Reference -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f3ff; border-radius: 8px; border: 1px solid #ddd6fe; margin-bottom: 28px;">
                                <tr><td style="padding: 20px;">
                                    <p style="color: #5b21b6; font-size: 13px; font-weight: 600; margin: 0 0 8px; text-transform: uppercase;">Related Question</p>
                                    <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0;">${data.questionText}</p>
                                </td></tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="${data.clarificationLink}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                                            View Response
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
