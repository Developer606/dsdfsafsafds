import nodemailer from "nodemailer";
import cryptoRandomString from "crypto-random-string";
import { createClient } from 'redis';
import rateLimit from 'express-rate-limit';

// Configure Redis client for rate limiting and caching
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Email transport configuration with connection pooling
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  pool: true, // Use pooled connections
  maxConnections: 100, // Maximum number of connections to use
  maxMessages: 10000, // Maximum number of messages to send per connection
  auth: {
    user: process.env.SMTP_USER || "noreply.animechat@gmail.com",
    pass: process.env.SMTP_PASS || "ibui zkqn zlcg xucg",
  },
  tls: {
    rejectUnauthorized: false // Only for development
  }
});

// Rate limiter configuration - 100k per minute = ~1666 per second
export const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100000, // limit each IP to 100k requests per windowMs
  message: { error: 'Too many OTP requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Efficient OTP generation
export async function generateOTP(): Promise<string> {
  return cryptoRandomString({ 
    length: 6, 
    type: 'numeric'
  });
}

// Helper to validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Optimized email sending with batching and retries
export async function sendVerificationEmail(email: string, otp: string) {
  // Check cache first
  const cachedOTP = await redisClient.get(`otp:${email}`);
  if (cachedOTP) {
    throw new Error('OTP already sent. Please wait before requesting a new one.');
  }

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

  try {
    // Store OTP in Redis with 10-minute expiration
    await redisClient.setEx(`otp:${email}`, 600, otp);

    // Send email with retry mechanism
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        await transporter.sendMail(mailOptions);
        break;
      } catch (error) {
        retries++;
        if (retries === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
      }
    }
  } catch (error) {
    // Clean up cache if email fails
    await redisClient.del(`otp:${email}`);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, otp: string) {
  // Similar optimizations as sendVerificationEmail
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

  try {
    await redisClient.setEx(`reset:${email}`, 600, otp);
    await transporter.sendMail(mailOptions);
  } catch (error) {
    await redisClient.del(`reset:${email}`);
    throw error;
  }
}

// Initialize and verify email configuration
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    await redisClient.connect();
    return true;
  } catch (error) {
    console.error("Email/Redis configuration error:", error);
    return false;
  }
}

// Cleanup function
export async function cleanup() {
  await redisClient.quit();
  await transporter.close();
}