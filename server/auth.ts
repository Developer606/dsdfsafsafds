import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema, adminLoginSchema } from "@shared/schema";
import cryptoRandomString from 'crypto-random-string';
import { generateOTP, sendVerificationEmail, sendPasswordResetEmail } from './email';

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Export hash password utility
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Middleware to check if user is admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ error: "Admin access required" });
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid credentials" });
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
          return done(null, false, { message: "Please verify your email first" });
        }

        await storage.updateLastLogin(user.id);
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Regular user registration
  app.post("/api/register", async (req, res) => {
    try {
      // Validate input using schema
      const parsedInput = insertUserSchema.safeParse(req.body);
      if (!parsedInput.success) {
        return res.status(400).json({ 
          error: "Invalid input",
          details: parsedInput.error.errors 
        });
      }

      // Don't allow registering as admin
      if (req.body.isAdmin || req.body.role === 'admin') {
        return res.status(400).json({ error: "Cannot register as admin" });
      }

      // Check if user exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Generate OTP for email verification
      const otp = await generateOTP();
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // 10 minutes expiry

      // Hash password and create user
      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        role: 'user',
        isAdmin: false,
        verificationToken: otp,
        verificationTokenExpiry: otpExpiry,
        isEmailVerified: false
      });

      // Send verification email
      await sendVerificationEmail(user.email, otp);

      res.status(201).json({
        message: "Registration successful. Please check your email for verification code.",
        userId: user.id
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed", details: error.message });
    }
  });

  // Email verification endpoint
  app.post("/api/verify-email", async (req, res) => {
    try {
      const { email, otp } = req.body;
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }

      if (!user.verificationToken || !user.verificationTokenExpiry) {
        return res.status(400).json({ error: "No verification pending" });
      }

      if (new Date() > new Date(user.verificationTokenExpiry)) {
        return res.status(400).json({ error: "Verification code expired" });
      }

      if (user.verificationToken !== otp) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      // Update user as verified
      await storage.updateUser(user.id, {
        isEmailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null
      });

      // Log in the user after verification
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed after verification" });
        }
        return res.json({ message: "Email verified successfully" });
      });
    } catch (error: any) {
      res.status(500).json({ error: "Verification failed", details: error.message });
    }
  });

  // Forgot password endpoint
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);

      if (!user) {
        // For security, don't reveal if email exists
        return res.json({ message: "If the email exists, a reset code will be sent" });
      }

      // Generate OTP and set expiry
      const otp = await generateOTP();
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // 10 minutes expiry

      // Update user with reset token
      await storage.updateUser(user.id, {
        resetPasswordToken: otp,
        resetPasswordTokenExpiry: otpExpiry
      });

      // Send password reset email
      await sendPasswordResetEmail(email, otp);

      res.json({ message: "If the email exists, a reset code will be sent" });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Reset password endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(404).json({ error: "Invalid reset request" });
      }

      if (!user.resetPasswordToken || !user.resetPasswordTokenExpiry) {
        return res.status(400).json({ error: "No reset request pending" });
      }

      if (new Date() > new Date(user.resetPasswordTokenExpiry)) {
        return res.status(400).json({ error: "Reset code expired" });
      }

      if (user.resetPasswordToken !== otp) {
        return res.status(400).json({ error: "Invalid reset code" });
      }

      // Update password and clear reset tokens
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordTokenExpiry: null
      });

      res.json({ message: "Password reset successful" });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Admin-specific login endpoint
  app.post("/api/admin/login", async (req, res, next) => {
    try {
      const { username, password } = req.body;

      // Verify admin credentials
      const user = await storage.getUserByUsername(username);
      if (!user || !user.isAdmin || !(await comparePasswords(password, user.password))) {
        return res.status(401).json({ error: "Invalid admin credentials" });
      }

      // Update last login time
      await storage.updateLastLogin(user.id);

      // Log in the admin
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Admin login failed" });
        }
        res.json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err: Error, user: Express.User) => {
      if (err) {
        return res.status(500).json({ error: "Login failed" });
      }
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Don't allow admin login through regular endpoint
      if (user.isAdmin) {
        return res.status(401).json({ error: "Please use admin login" });
      }

      await storage.updateLastLogin(user.id);

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });
}