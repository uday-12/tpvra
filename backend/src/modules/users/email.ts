import { sendEmail } from "@/lib/mailer";

export const sendAccountApprovedEmail = async (email: string, name: string) => {
    const subject = "Account Approved - Across Verticals";
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Account Approved</h2>
      <p>Hello ${name},</p>
      <p>Your account has been approved by the administrator.</p>
      <p>You can now sign in to your account using the email address you registered with.</p>
      <br />
      <p>Best regards,</p>
      <p>Across Verticals Team</p>
    </div>
  `;
    const text = `Hello ${name}, Your account has been approved by the administrator. You can now sign in to your account.`;

    await sendEmail(email, subject, html, text);
};

export const sendAccountRejectedEmail = async (email: string, name: string) => {
    const subject = "Account Application Update - Across Verticals";
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Account Application Status</h2>
      <p>Hello ${name},</p>
      <p>Thank you for your interest in Across Verticals.</p>
      <p>After reviewing your application, we regret to inform you that your account request has been declined at this time.</p>
      <p>If you have any questions, please contact support.</p>
      <br />
      <p>Best regards,</p>
      <p>Across Verticals Team</p>
    </div>
  `;
    const text = `Hello ${name}, Your account application has been declined. Please contact support for more information.`;

    await sendEmail(email, subject, html, text);
};
