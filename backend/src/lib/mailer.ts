import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Initialize the SES Client
const sesClient = new SESClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

/**
 * Sends an email using AWS SES
 * @param to - Recipient email address or array of addresses
 * @param subject - Email subject
 * @param html - HTML content of the email
 * @param text - Plain text fallback content (optional)
 * @param from - Sender email address (optional, defaults to AWS_SES_FROM_EMAIL)
 */
export const sendEmail = async (
    to: string | string[],
    subject: string,
    html: string,
    text?: string,
    from?: string
) => {
    const toAddresses = Array.isArray(to) ? to : [to];
    const sourceEmail = from || process.env.AWS_SES_FROM_EMAIL;

    if (!sourceEmail) {
        throw new Error(
            "Source email is not defined. Please pass it explicitly or set AWS_SES_FROM_EMAIL env var."
        );
    }

    const params = {
        Source: sourceEmail,
        Destination: {
            ToAddresses: toAddresses,
        },
        Message: {
            Subject: {
                Data: subject,
                Charset: "UTF-8",
            },
            Body: {
                Html: {
                    Data: html,
                    Charset: "UTF-8",
                },
                Text: {
                    Data: text || "Please view this email in an HTML-compatible client.",
                    Charset: "UTF-8",
                },
            },
        },
    };

    try {
        const command = new SendEmailCommand(params);
        const response = await sesClient.send(command);
        return response;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};
