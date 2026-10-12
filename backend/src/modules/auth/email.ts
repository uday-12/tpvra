import { sendEmail } from "@/lib/mailer";

export const sendOtpEmail = async (
    email: string,
    otp: string,
    type: "sign-in" | "email-verification" | "forget-password"
) => {
    const subject =
        type === "sign-in"
            ? "Your Sign-In OTP"
            : type === "email-verification"
                ? "Verify Your Email"
                : "Reset Your Password";

    const actionText =
        type === "sign-in"
            ? "sign in to your account"
            : type === "email-verification"
                ? "verify your email address"
                : "reset your password";

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${subject}</h2>
      <p>Hello,</p>
      <p>Use the following One-Time Password (OTP) to ${actionText}:</p>
      <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This OTP is valid for a limited time. Do not share this code with anyone.</p>
      <p>If you did not request this, please ignore this email.</p>
      <br />
      <p>Best regards,</p>
      <p>Across Verticals Team</p>
    </div>
  `;

    const text = `Hello, use the following OTP to ${actionText}: ${otp}. This code is valid for a limited time.`;

    await sendEmail(email, subject, html, text);
};
