import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema, adminLoginSchema } from "@shared/schema";
import cryptoRandomString from 'crypto-random-string';
import { generateOTP, sendVerificationEmail } from "./email";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
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

        // Check if email is verified for non-admin users
        if (!user.isAdmin && !user.isEmailVerified) {
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
      const parsedInput = insertUserSchema.safeParse(req.body);
      if (!parsedInput.success) {
        return res.status(400).json({ 
          error: "Invalid input",
          details: parsedInput.error.errors 
        });
      }

      if (req.body.isAdmin || req.body.role === 'admin') {
        return res.status(400).json({ error: "Cannot register as admin" });
      }

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Generate OTP and set expiry
      const otp = await generateOTP();
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        role: 'user',
        isAdmin: false,
        isEmailVerified: false,
        verificationToken: otp,
        verificationTokenExpiry: otpExpiry
      });

      // Send verification email
      await sendVerificationEmail(user.email, otp);

      res.status(201).json({ 
        message: "Registration successful. Please check your email for verification code."
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

      const verified = await storage.verifyEmail(user.id, otp);
      if (!verified) {
        return res.status(400).json({ error: "Invalid or expired verification code" });
      }

      // Log the user in after verification
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed after verification" });
        }
        return res.json(user);
      });
    } catch (error: any) {
      console.error("Verification error:", error);
      res.status(500).json({ error: "Verification failed", details: error.message });
    }
  });

  // Password reset request endpoint
  app.post("/api/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: "If an account exists with this email, you will receive a reset code." });
      }

      // Generate OTP and set expiry
      const otp = await generateOTP();
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

      await storage.updateVerificationToken(user.id, otp, otpExpiry);
      await sendVerificationEmail(email, otp);

      res.json({ message: "If an account exists with this email, you will receive a reset code." });
    } catch (error: any) {
      console.error("Password reset request error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Reset password endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email, password, otp } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const verified = await storage.verifyEmail(user.id, otp);
      if (!verified) {
        return res.status(400).json({ error: "Invalid or expired reset code" });
      }

      // Update password
      const hashedPassword = await hashPassword(password);
      await storage.updateUser(user.id, { password: hashedPassword });

      res.json({ message: "Password reset successful" });
    } catch (error: any) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Admin login, regular login, logout, and user endpoints remain unchanged
  app.post("/api/admin/login", async (req, res, next) => {
    try {
      const { username, password } = req.body;

      const user = await storage.getUserByUsername(username);
      if (!user || !user.isAdmin || !(await comparePasswords(password, user.password))) {
        return res.status(401).json({ error: "Invalid admin credentials" });
      }

      await storage.updateLastLogin(user.id);

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