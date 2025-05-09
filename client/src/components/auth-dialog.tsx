import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { insertUserSchema, loginSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { Eye, EyeOff, Mail, User, Lock, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FaGoogle, FaFacebook, FaGithub, FaApple } from "react-icons/fa";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

// Additional schema for OTP verification
const otpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

type AuthStep = "login" | "register" | "verify" | "forgot" | "reset";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (isNewUser?: boolean) => void;
};

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
  const [authStep, setAuthStep] = useState<AuthStep>("login");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [registrationData, setRegistrationData] = useState<{
    username: string;
    email: string;
    password: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // States for real-time username and email validation
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [usernameMessage, setUsernameMessage] = useState<string>("");
  const [checkingUsername, setCheckingUsername] = useState(false);

  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailMessage, setEmailMessage] = useState<string>("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const { toast } = useToast();

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Extended schema with stronger password validation
  const registerSchema = insertUserSchema.extend({
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const otpForm = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      email: "",
      otp: "",
    },
  });

  const forgotPasswordForm = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetPasswordForm = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      otp: "",
      newPassword: "",
    },
  });

  const login = useMutation({
    mutationFn: async (data: {
      username: string;
      password: string;
      rememberMe?: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/login", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Login failed");
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      onSuccess(false); // Not a new user
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Registration mutation
  const register = useMutation({
    mutationFn: async (data: {
      username: string;
      email: string;
      password: string;
    }) => {
      // First, check if the username and email are available
      const [usernameCheckRes, emailCheckRes] = await Promise.all([
        fetch(`/api/auth/check-username/${data.username}`),
        fetch(`/api/auth/check-email/${data.email}`)
      ]);
      
      const usernameData = await usernameCheckRes.json();
      const emailData = await emailCheckRes.json();
      
      // Validate availability of both username and email
      if (!usernameData.available) {
        throw new Error(usernameData.message || "Username is already taken");
      }
      
      if (!emailData.available) {
        throw new Error(emailData.message || "Email is already registered");
      }
      
      // Send OTP along with registration data
      const res = await apiRequest("POST", "/api/verify/send-otp", {
        email: data.email,
        registrationData: data, // Include full registration data
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send verification code");
      }

      // Store registration data for later use
      setRegistrationData(data);
      setVerificationEmail(data.email);
      return data;
    },
    onSuccess: (data) => {
      setAuthStep("verify");
      // Set both the hidden email field and store verification email
      otpForm.setValue("email", data.email);
      setVerificationEmail(data.email);
      toast({
        title: "Verification Code Sent",
        description: "Please check your email for the verification code",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // OTP verification mutation
  const verifyOTP = useMutation({
    mutationFn: async (data: { email: string; otp: string }) => {
      // Ensure we're using the stored verification email
      const verifyData = {
        email: verificationEmail,
        otp: data.otp,
      };

      const res = await apiRequest(
        "POST",
        "/api/verify/verify-otp",
        verifyData,
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Invalid verification code");
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Success",
        description: "Email verified and account created successfully!",
      });
      onSuccess(true); // Signal this is a new user that needs profile completion
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const forgotPassword = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send reset code");
      }
      setVerificationEmail(data.email);
      return res.json();
    },
    onSuccess: () => {
      setAuthStep("reset");
      resetPasswordForm.setValue("email", verificationEmail);
      toast({
        title: "Reset Code Sent",
        description: "Please check your email for the password reset code",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const resetPassword = useMutation({
    mutationFn: async (data: {
      email: string;
      otp: string;
      newPassword: string;
    }) => {
      const res = await apiRequest("POST", "/api/auth/reset-password", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reset password");
      }
      return res.json();
    },
    onSuccess: () => {
      setAuthStep("login");
      toast({
        title: "Success",
        description:
          "Password reset successfully. Please login with your new password.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const isMobile = useIsMobile();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`
        ${
          isMobile
            ? "max-w-full h-full rounded-none m-0 p-0 gap-0 bg-black text-white"
            : "sm:max-w-[400px] p-0 gap-0 bg-gradient-to-b from-background/95 to-background/85 backdrop-blur-xl border-none shadow-2xl"
        }
      `}
      >
        <DialogHeader
          className={`
          ${
            isMobile
              ? "p-4 pb-2 bg-black border-b border-gray-800"
              : "p-6 pb-2 bg-gradient-to-b from-primary/10 to-transparent"
          }
        `}
        >
          {isMobile && authStep !== "login" && (
            <button
              onClick={() =>
                authStep === "register"
                  ? setAuthStep("login")
                  : authStep === "verify"
                    ? setAuthStep("register")
                    : authStep === "reset"
                      ? setAuthStep("login")
                      : setAuthStep("login")
              }
              className="absolute left-4 top-4 text-white"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          )}
          <DialogTitle
            className={`
            ${
              isMobile
                ? "text-xl font-medium text-center text-white"
                : "text-2xl font-bold text-center"
            }
          `}
          >
            {authStep === "login" && "Welcome Back!"}
            {authStep === "register" && "Create Account"}
            {authStep === "verify" && "Verify Email"}
            {authStep === "forgot" && "Reset Password"}
            {authStep === "reset" && "New Password"}
          </DialogTitle>
        </DialogHeader>

        <div
          className={`
          ${
            isMobile
              ? "px-4 pb-4 pt-2 space-y-4 bg-black text-white"
              : "px-6 pb-6 space-y-6"
          }
        `}
        >
          {authStep === "login" && (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={loginForm.handleSubmit((data) =>
                login.mutate({ ...data, rememberMe }),
              )}
              className="space-y-4"
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="username" className="text-sm font-medium">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground/50" />
                    <Input
                      id="username"
                      {...loginForm.register("username")}
                      className={`pl-10 ${isMobile ? "bg-gray-900 border-gray-700 text-white" : "bg-background/50"}`}
                      placeholder="Enter your username"
                    />
                  </div>
                  {loginForm.formState.errors.username && (
                    <p className="text-sm text-destructive mt-1">
                      {loginForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground/50" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...loginForm.register("password")}
                      className={`pl-10 pr-10 ${isMobile ? "bg-gray-900 border-gray-700 text-white" : "bg-background/50"}`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 text-muted-foreground/50 hover:text-primary transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive mt-1">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm font-medium leading-none cursor-pointer"
                    onClick={() => setRememberMe(!rememberMe)}
                  >
                    Remember me
                  </label>
                </div>
                <Button
                  type="submit"
                  className={`w-full ${isMobile ? "bg-[#6200EE] text-white rounded-md font-medium" : "bg-primary hover:bg-primary/90"} transition-colors`}
                  disabled={login.isPending}
                >
                  {login.isPending ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                    />
                  ) : null}
                  {login.isPending ? "Logging in..." : "Login"}
                </Button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <Separator
                      className={`w-full ${isMobile ? "bg-gray-700" : ""}`}
                    />
                  </div>
                  <div className="relative flex justify-center">
                    <span
                      className={`px-2 text-xs ${isMobile ? "bg-black text-gray-400" : "bg-background text-muted-foreground"}`}
                    >
                      OR CONTINUE WITH
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={`${isMobile ? "bg-gray-900 border-gray-700 hover:bg-gray-800" : "bg-background/50"}`}
                    onClick={() => {
                      // Redirect to the Google OAuth route
                      window.location.href = "/api/auth/google";
                    }}
                  >
                    <FaGoogle className="h-5 w-5 text-[#4285F4]" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`${isMobile ? "bg-gray-900 border-gray-700 hover:bg-gray-800" : "bg-background/50"}`}
                    onClick={() => {
                      toast({
                        title: "Facebook Login",
                        description: "Facebook login will be implemented soon!",
                      });
                    }}
                  >
                    <FaFacebook className="h-5 w-5 text-[#1877F2]" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`${isMobile ? "bg-gray-900 border-gray-700 hover:bg-gray-800" : "bg-background/50"}`}
                    onClick={() => {
                      toast({
                        title: "GitHub Login",
                        description: "GitHub login will be implemented soon!",
                      });
                    }}
                  >
                    <FaGithub
                      className={`h-5 w-5 ${isMobile ? "text-white" : ""}`}
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`${isMobile ? "bg-gray-900 border-gray-700 hover:bg-gray-800" : "bg-background/50"}`}
                    onClick={() => {
                      toast({
                        title: "Apple Login",
                        description: "Apple login will be implemented soon!",
                      });
                    }}
                  >
                    <FaApple
                      className={`h-5 w-5 ${isMobile ? "text-white" : ""}`}
                    />
                  </Button>
                </div>
                <div className="space-y-2 text-center">
                  <button
                    type="button"
                    className={`text-sm ${isMobile ? "text-[#BB86FC]" : "text-primary"} hover:underline transition-colors`}
                    onClick={() => setAuthStep("forgot")}
                  >
                    Forgot password?
                  </button>
                  <p
                    className={`text-sm ${isMobile ? "text-gray-400" : "text-muted-foreground"}`}
                  >
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className={`${isMobile ? "text-[#BB86FC]" : "text-primary"} hover:underline transition-colors font-medium`}
                      onClick={() => setAuthStep("register")}
                    >
                      Sign up
                    </button>
                  </p>
                </div>
              </div>
            </motion.form>
          )}

          {authStep === "register" && (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={registerForm.handleSubmit((data) =>
                register.mutate(data),
              )}
              className="space-y-4"
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="username" className="text-sm font-medium">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground/50" />
                    <Input
                      id="username"
                      {...registerForm.register("username", {
                        onChange: async (e) => {
                          const username = e.target.value;
                          if (username.length >= 3) {
                            setCheckingUsername(true);
                            try {
                              const res = await fetch(
                                `/api/auth/check-username/${username}`,
                              );
                              const data = await res.json();
                              setUsernameAvailable(data.available);
                              setUsernameMessage(data.message);
                            } catch (error) {
                              console.error("Error checking username:", error);
                            } finally {
                              setCheckingUsername(false);
                            }
                          } else {
                            setUsernameAvailable(null);
                            setUsernameMessage("");
                          }
                        },
                      })}
                      className={`pl-10 ${isMobile ? "bg-gray-900 border-gray-700 text-white" : "bg-background/50"} ${
                        usernameAvailable === true
                          ? "border-green-500"
                          : usernameAvailable === false
                            ? "border-red-500"
                            : ""
                      }`}
                      placeholder="Choose a username"
                    />
                  </div>
                  {registerForm.formState.errors.username && (
                    <p className="text-sm text-destructive mt-1">
                      {registerForm.formState.errors.username.message}
                    </p>
                  )}
                  {usernameMessage &&
                    !registerForm.formState.errors.username && (
                      <p
                        className={`text-sm mt-1 ${usernameAvailable ? "text-green-500" : "text-destructive"}`}
                      >
                        {checkingUsername
                          ? "Checking username..."
                          : usernameMessage}
                      </p>
                    )}
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground/50" />
                    <Input
                      id="email"
                      type="email"
                      {...registerForm.register("email", {
                        onChange: async (e) => {
                          const email = e.target.value;
                          if (
                            email &&
                            email.includes("@") &&
                            email.includes(".")
                          ) {
                            setCheckingEmail(true);
                            try {
                              const res = await fetch(
                                `/api/auth/check-email/${email}`,
                              );
                              const data = await res.json();
                              setEmailAvailable(data.available);
                              setEmailMessage(data.message);
                            } catch (error) {
                              console.error("Error checking email:", error);
                            } finally {
                              setCheckingEmail(false);
                            }
                          } else {
                            setEmailAvailable(null);
                            setEmailMessage("");
                          }
                        },
                      })}
                      className={`pl-10 ${isMobile ? "bg-gray-900 border-gray-700 text-white" : "bg-background/50"} ${
                        emailAvailable === true
                          ? "border-green-500"
                          : emailAvailable === false
                            ? "border-red-500"
                            : ""
                      }`}
                      placeholder="Enter your email"
                    />
                  </div>
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-destructive mt-1">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                  {emailMessage && !registerForm.formState.errors.email && (
                    <p
                      className={`text-sm mt-1 ${emailAvailable ? "text-green-500" : "text-destructive"}`}
                    >
                      {checkingEmail ? "Checking email..." : emailMessage}
                    </p>
                  )}
                </div>
                <div>
                  <Label
                    htmlFor="registerPassword"
                    className="text-sm font-medium"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground/50" />
                    <Input
                      id="registerPassword"
                      type={showRegisterPassword ? "text" : "password"}
                      {...registerForm.register("password")}
                      className={`pl-10 pr-10 ${isMobile ? "bg-gray-900 border-gray-700 text-white" : "bg-background/50"}`}
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowRegisterPassword(!showRegisterPassword)
                      }
                      className="absolute right-2 top-2 text-muted-foreground/50 hover:text-primary transition-colors"
                    >
                      {showRegisterPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive mt-1">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                  {/* Password requirements display */}
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <p>Password must:</p>
                    <ul className="space-y-1 list-disc pl-4">
                      <li className={registerForm.watch("password")?.length >= 8 ? "text-green-500" : ""}>
                        Be at least 8 characters long
                      </li>
                      <li className={/[A-Z]/.test(registerForm.watch("password") || "") ? "text-green-500" : ""}>
                        Include at least one uppercase letter
                      </li>
                      <li className={/[0-9]/.test(registerForm.watch("password") || "") ? "text-green-500" : ""}>
                        Include at least one number
                      </li>
                      <li className={/[^A-Za-z0-9]/.test(registerForm.watch("password") || "") ? "text-green-500" : ""}>
                        Include at least one special character
                      </li>
                    </ul>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 transition-colors"
                  disabled={register.isPending}
                >
                  {register.isPending ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                    />
                  ) : null}
                  {register.isPending
                    ? "Creating account..."
                    : "Create Account"}
                </Button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <Separator
                      className={`w-full ${isMobile ? "bg-gray-700" : ""}`}
                    />
                  </div>
                  <div className="relative flex justify-center">
                    <span
                      className={`px-2 text-xs ${isMobile ? "bg-black text-gray-400" : "bg-background text-muted-foreground"}`}
                    >
                      OR SIGN UP WITH
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={`${isMobile ? "bg-gray-900 border-gray-700 hover:bg-gray-800" : "bg-background/50"}`}
                    onClick={() => {
                      // Redirect to the Google OAuth route for signup
                      window.location.href = "/api/auth/google";
                    }}
                  >
                    <FaGoogle className="h-5 w-5 text-[#4285F4]" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`${isMobile ? "bg-gray-900 border-gray-700 hover:bg-gray-800" : "bg-background/50"}`}
                    onClick={() => {
                      toast({
                        title: "Facebook Signup",
                        description:
                          "Facebook signup will be implemented soon!",
                      });
                    }}
                  >
                    <FaFacebook className="h-5 w-5 text-[#1877F2]" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`${isMobile ? "bg-gray-900 border-gray-700 hover:bg-gray-800" : "bg-background/50"}`}
                    onClick={() => {
                      toast({
                        title: "GitHub Signup",
                        description: "GitHub signup will be implemented soon!",
                      });
                    }}
                  >
                    <FaGithub
                      className={`h-5 w-5 ${isMobile ? "text-white" : ""}`}
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`${isMobile ? "bg-gray-900 border-gray-700 hover:bg-gray-800" : "bg-background/50"}`}
                    onClick={() => {
                      toast({
                        title: "Apple Signup",
                        description: "Apple signup will be implemented soon!",
                      });
                    }}
                  >
                    <FaApple
                      className={`h-5 w-5 ${isMobile ? "text-white" : ""}`}
                    />
                  </Button>
                </div>

                <p
                  className={`text-center text-sm ${isMobile ? "text-gray-400" : "text-muted-foreground"}`}
                >
                  Already have an account?{" "}
                  <button
                    type="button"
                    className={`${isMobile ? "text-[#BB86FC]" : "text-primary"} hover:underline transition-colors font-medium`}
                    onClick={() => setAuthStep("login")}
                  >
                    Login
                  </button>
                </p>
              </div>
            </motion.form>
          )}

          {authStep === "verify" && (
            <form
              onSubmit={otpForm.handleSubmit((data) =>
                verifyOTP.mutate({ ...data, email: verificationEmail }),
              )}
            >
              <div className="space-y-4">
                <p className="text-sm text-center">
                  We've sent a verification code to {verificationEmail}.<br />
                  Please enter it below to verify your account.
                </p>
                <div>
                  <Label htmlFor="otp" className="text-sm font-medium">
                    Verification Code
                  </Label>
                  <Input
                    id="otp"
                    {...otpForm.register("otp")}
                    className="mt-1 text-center text-2xl tracking-[0.5em] bg-background/50"
                    maxLength={6}
                    placeholder="Enter verification code"
                  />
                  {otpForm.formState.errors.otp && (
                    <p className="text-sm text-destructive mt-1">
                      {otpForm.formState.errors.otp.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 transition-colors"
                  disabled={verifyOTP.isPending}
                >
                  {verifyOTP.isPending ? "Verifying..." : "Verify Email"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Didn't receive the code?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline transition-colors font-medium"
                    onClick={() => {
                      if (registrationData) {
                        register.mutate(registrationData);
                      }
                    }}
                  >
                    Resend
                  </button>
                </p>
              </div>
            </form>
          )}

          {authStep === "forgot" && (
            <form
              onSubmit={forgotPasswordForm.handleSubmit((data) =>
                forgotPassword.mutate(data),
              )}
            >
              <div className="space-y-4">
                <p className="text-sm text-center">
                  Enter your email address and we'll send you a code to reset
                  your password.
                </p>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground/50" />
                    <Input
                      id="email"
                      type="email"
                      {...forgotPasswordForm.register("email")}
                      className="pl-10 bg-background/50"
                      placeholder="Enter your email"
                    />
                  </div>
                  {forgotPasswordForm.formState.errors.email && (
                    <p className="text-sm text-destructive mt-1">
                      {forgotPasswordForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 transition-colors"
                  disabled={forgotPassword.isPending}
                >
                  {forgotPassword.isPending ? "Sending..." : "Send Reset Code"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline transition-colors font-medium"
                    onClick={() => setAuthStep("login")}
                  >
                    Login
                  </button>
                </p>
              </div>
            </form>
          )}

          {authStep === "reset" && (
            <form
              onSubmit={resetPasswordForm.handleSubmit((data) =>
                resetPassword.mutate(data),
              )}
            >
              <div className="space-y-4">
                <p className="text-sm text-center">
                  Enter the code sent to your email and your new password.
                </p>
                <div>
                  <Label htmlFor="otp" className="text-sm font-medium">
                    Reset Code
                  </Label>
                  <Input
                    id="otp"
                    {...resetPasswordForm.register("otp")}
                    className="mt-1 text-center text-2xl tracking-[0.5em] bg-background/50"
                    maxLength={6}
                    placeholder="Enter reset code"
                  />
                  {resetPasswordForm.formState.errors.otp && (
                    <p className="text-sm text-destructive mt-1">
                      {resetPasswordForm.formState.errors.otp.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="newPassword" className="text-sm font-medium">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground/50" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      {...resetPasswordForm.register("newPassword")}
                      className="pl-10 pr-10 bg-background/50"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-2 text-muted-foreground/50 hover:text-primary transition-colors"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {resetPasswordForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive mt-1">
                      {resetPasswordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                  {/* Password requirements display */}
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <p>Password must:</p>
                    <ul className="space-y-1 list-disc pl-4">
                      <li className={resetPasswordForm.watch("newPassword")?.length >= 8 ? "text-green-500" : ""}>
                        Be at least 8 characters long
                      </li>
                      <li className={/[A-Z]/.test(resetPasswordForm.watch("newPassword") || "") ? "text-green-500" : ""}>
                        Include at least one uppercase letter
                      </li>
                      <li className={/[0-9]/.test(resetPasswordForm.watch("newPassword") || "") ? "text-green-500" : ""}>
                        Include at least one number
                      </li>
                      <li className={/[^A-Za-z0-9]/.test(resetPasswordForm.watch("newPassword") || "") ? "text-green-500" : ""}>
                        Include at least one special character
                      </li>
                    </ul>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 transition-colors"
                  disabled={resetPassword.isPending}
                >
                  {resetPassword.isPending ? "Resetting..." : "Reset Password"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Didn't receive the code?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline transition-colors font-medium"
                    onClick={() =>
                      forgotPassword.mutate(forgotPasswordForm.getValues())
                    }
                  >
                    Resend
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
