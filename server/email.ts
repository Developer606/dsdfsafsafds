import nodemailer from 'nodemailer';
import cryptoRandomString from 'crypto-random-string';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false
  }
});

export async function generateOTP(): Promise<string> {
  return cryptoRandomString({ length: 6, type: 'numeric' });
}

export async function sendVerificationEmail(email: string, otp: string) {
  try {
    const mailOptions = {
      from: `"Anime Chat" <${process.env.SMTP_USER}>`,
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

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, otp: string) {
  try {
    const mailOptions = {
      from: `"Anime Chat" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset - Anime Chat App',
      html: `
        <h1>Password Reset Request</h1>
        <p>We received a request to reset your password. Use the following OTP to proceed:</p>
        <h2 style="color: #4F46E5; font-size: 24px; letter-spacing: 5px; padding: 20px; background: #F3F4F6; text-align: center; border-radius: 8px;">
          ${otp}
        </h2>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email and ensure your account is secure.</p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

// Initialize and verify SMTP connection
async function verifyEmailSetup() {
  try {
    await transporter.verify();
    console.log('SMTP Server is ready to send emails');
  } catch (error) {
    console.error('SMTP Connection Error:', error);
    // Don't throw the error, just log it
  }
}

// Verify email setup on startup
verifyEmailSetup();