import nodemailer from "nodemailer";
import cryptoRandomString from "crypto-random-string";
import { getApiKey } from "./admin-db";

// Initialize transporter later since we need to fetch credentials from the database
let transporter: nodemailer.Transporter | null = null;

export async function generateOTP(): Promise<string> {
  return cryptoRandomString({ length: 6, type: "numeric" });
}

// Helper to validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Initialize the email transporter with credentials from database
export async function initializeEmailTransporter(): Promise<boolean> {
  try {
    // Get credentials from database
    const smtpUser = await getApiKey("SMTP_USER") || process.env.SMTP_USER;
    const smtpPassword = await getApiKey("SMTP_PASSWORD") || process.env.SMTP_PASSWORD;
    const smtpHost = await getApiKey("SMTP_HOST") || process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = await getApiKey("SMTP_PORT") || process.env.SMTP_PORT || "587";
    
    // Check if we have the required credentials
    if (!smtpUser || !smtpPassword) {
      console.error("Missing SMTP credentials. Email functionality will not work.");
      return false;
    }
    
    // Create the transporter
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });
    
    // Verify connection
    await transporter.verify();
    console.log("Email transporter initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize email transporter:", error);
    return false;
  }
}

export async function sendVerificationEmail(email: string, otp: string) {
  // Make sure transporter is initialized
  if (!transporter) {
    await initializeEmailTransporter();
    if (!transporter) {
      throw new Error("Email service not configured");
    }
  }
  
  // Get sender email from database
  const senderEmail = await getApiKey("SMTP_USER") || process.env.SMTP_USER || "noreply@animechat.com";
  
  const mailOptions = {
    from: senderEmail,
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
  // Make sure transporter is initialized
  if (!transporter) {
    await initializeEmailTransporter();
    if (!transporter) {
      throw new Error("Email service not configured");
    }
  }
  
  // Get sender email from database
  const senderEmail = await getApiKey("SMTP_USER") || process.env.SMTP_USER || "noreply@animechat.com";
  
  const mailOptions = {
    from: senderEmail,
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
    if (!transporter) {
      return await initializeEmailTransporter();
    }
    await transporter.verify();
    return true;
  } catch (error) {
    console.error("Email configuration error:", error);
    return false;
  }
}
