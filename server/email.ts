import nodemailer from 'nodemailer';
import cryptoRandomString from 'crypto-random-string';

// Configure test email service (for development)
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export async function sendOTP(email: string, otp: string) {
  const mailOptions = {
    from: '"Anime Character Chat" <noreply@animecharacter.chat>',
    to: email,
    subject: 'Email Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Anime Character Chat!</h2>
        <p>Your email verification code is:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 10px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send verification email');
  }
}

export function generateOTP(): string {
  return cryptoRandomString({
    length: 6,
    type: 'numeric'
  });
}
