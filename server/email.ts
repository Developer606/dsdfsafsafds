import nodemailer from 'nodemailer';
import cryptoRandomString from 'crypto-random-string';

const transporter = nodemailer.createTransport({
  service: 'gmail',  // Using Gmail service instead of manual SMTP config
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  debug: true, // Enable debug logging
  logger: true // Enable built-in logger
});

export async function generateOTP(): Promise<string> {
  return cryptoRandomString({ length: 6, type: 'numeric' });
}

export async function sendVerificationEmail(email: string, otp: string) {
  try {
    // Test SMTP connection before sending
    await transporter.verify();

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

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}