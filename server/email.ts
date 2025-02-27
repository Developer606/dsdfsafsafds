import nodemailer from "nodemailer";
import cryptoRandomString from "crypto-random-string";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: "noreply.animechat@gmail.com",
    pass: "ibui zkqn zlcg xucg",
  },
});

export async function generateOTP(): Promise<string> {
  return cryptoRandomString({ length: 6, type: "numeric" });
}

// Helper to validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function sendVerificationEmail(email: string, otp: string) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Email Verification - Anime Chat App",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #075e54; text-align: center;">Email Verification</h1>
        <p>Welcome to Anime Chat! Please use the following OTP to verify your email:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h2 style="color: #075e54; font-size: 32px; letter-spacing: 5px; margin: 0;">
            ${otp}
          </h2>
        </div>
        <p style="color: #666;">This OTP will expire in 10 minutes.</p>
        <p style="color: #666;">If you didn't request this verification, please ignore this email.</p>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px;">© ${new Date().getFullYear()} Anime Chat. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendPasswordResetEmail(email: string, otp: string) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Password Reset - Anime Chat App",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #075e54; text-align: center;">Password Reset</h1>
        <p>You've requested to reset your password. Use this OTP to proceed:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h2 style="color: #075e54; font-size: 32px; letter-spacing: 5px; margin: 0;">
            ${otp}
          </h2>
        </div>
        <p style="color: #666;">This OTP will expire in 10 minutes.</p>
        <p style="color: #666;">If you didn't request this password reset, please contact support immediately.</p>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px;">© ${new Date().getFullYear()} Anime Chat. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

// Initialize and verify email configuration
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error("Email configuration error:", error);
    return false;
  }
}
