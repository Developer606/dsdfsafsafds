import nodemailer from 'nodemailer';
import cryptoRandomString from 'crypto-random-string';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function generateOTP(): Promise<string> {
  return cryptoRandomString({ length: 6, type: 'numeric' });
}

export async function sendVerificationEmail(email: string, otp: string) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Email Verification - Anime Chat App',
    html: `
      <h1>Email Verification</h1>
      <p>Thanks for registering! Please use the following OTP to verify your email:</p>
      <h2 style="color: #4F46E5; font-size: 24px; letter-spacing: 5px; padding: 20px; background: #F3F4F6; text-align: center; border-radius: 8px;">
        ${otp}
      </h2>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
}
