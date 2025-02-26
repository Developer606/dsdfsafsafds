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
import { insertUserSchema, loginSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { z } from "zod";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

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
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

type AuthStep = "login" | "register" | "verify" | "forgot" | "reset";

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
  const [authStep, setAuthStep] = useState<AuthStep>("login");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [registrationData, setRegistrationData] = useState<{ username: string; email: string; password: string } | null>(null);
  const { toast } = useToast();

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
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
    mutationFn: async (data: { username: string; password: string }) => {
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
      onSuccess();
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
    mutationFn: async (data: { username: string; email: string; password: string }) => {
      // Send OTP along with registration data
      const res = await apiRequest("POST", "/api/verify/send-otp", { 
        email: data.email,
        registrationData: data // Include full registration data
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
        otp: data.otp
      };

      const res = await apiRequest("POST", "/api/verify/verify-otp", verifyData);
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
      onSuccess();
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
    mutationFn: async (data: { email: string; otp: string; newPassword: string }) => {
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
        description: "Password reset successfully. Please login with your new password.",
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

  // When rendering the verify form, we'll use the stored verification email
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {authStep === "login" && "Login to Your Account"}
            {authStep === "register" && "Create an Account"}
            {authStep === "verify" && "Verify Your Email"}
            {authStep === "forgot" && "Reset Password"}
            {authStep === "reset" && "Enter New Password"}
          </DialogTitle>
        </DialogHeader>

        {authStep === "login" && (
          <form onSubmit={loginForm.handleSubmit((data) => login.mutate(data))}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  {...loginForm.register("username")}
                  className="mt-1"
                />
                {loginForm.formState.errors.username && (
                  <p className="text-sm text-destructive mt-1">
                    {loginForm.formState.errors.username.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...loginForm.register("password")}
                  className="mt-1"
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={login.isPending}
              >
                {login.isPending ? "Logging in..." : "Login"}
              </Button>
              <div className="text-center space-y-2">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => setAuthStep("forgot")}
                >
                  Forgot password?
                </button>
                <p className="text-sm">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setAuthStep("register")}
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </div>
          </form>
        )}

        {authStep === "register" && (
          <form onSubmit={registerForm.handleSubmit((data) => register.mutate(data))}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  {...registerForm.register("username")}
                  className="mt-1"
                />
                {registerForm.formState.errors.username && (
                  <p className="text-sm text-destructive mt-1">
                    {registerForm.formState.errors.username.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...registerForm.register("email")}
                  className="mt-1"
                />
                {registerForm.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...registerForm.register("password")}
                  className="mt-1"
                />
                {registerForm.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={register.isPending}
              >
                {register.isPending ? "Creating account..." : "Create Account"}
              </Button>
              <p className="text-center text-sm">
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setAuthStep("login")}
                >
                  Login
                </button>
              </p>
            </div>
          </form>
        )}

        {authStep === "verify" && (
          <form onSubmit={otpForm.handleSubmit((data) => verifyOTP.mutate({ ...data, email: verificationEmail }))}>
            <div className="space-y-4">
              <p className="text-sm text-center">
                We've sent a verification code to {verificationEmail}.<br />
                Please enter it below to verify your account.
              </p>
              <div>
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  {...otpForm.register("otp")}
                  className="mt-1 text-center text-2xl tracking-[0.5em]"
                  maxLength={6}
                />
                {otpForm.formState.errors.otp && (
                  <p className="text-sm text-destructive mt-1">
                    {otpForm.formState.errors.otp.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={verifyOTP.isPending}
              >
                {verifyOTP.isPending ? "Verifying..." : "Verify Email"}
              </Button>
              <p className="text-center text-sm">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
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
          <form onSubmit={forgotPasswordForm.handleSubmit((data) => forgotPassword.mutate(data))}>
            <div className="space-y-4">
              <p className="text-sm text-center">
                Enter your email address and we'll send you a code
                to reset your password.
              </p>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...forgotPasswordForm.register("email")}
                  className="mt-1"
                />
                {forgotPasswordForm.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {forgotPasswordForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={forgotPassword.isPending}
              >
                {forgotPassword.isPending ? "Sending..." : "Send Reset Code"}
              </Button>
              <p className="text-center text-sm">
                Remember your password?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setAuthStep("login")}
                >
                  Login
                </button>
              </p>
            </div>
          </form>
        )}

        {authStep === "reset" && (
          <form onSubmit={resetPasswordForm.handleSubmit((data) => resetPassword.mutate(data))}>
            <div className="space-y-4">
              <p className="text-sm text-center">
                Enter the code sent to your email and your new password.
              </p>
              <div>
                <Label htmlFor="otp">Reset Code</Label>
                <Input
                  id="otp"
                  {...resetPasswordForm.register("otp")}
                  className="mt-1 text-center text-2xl tracking-[0.5em]"
                  maxLength={6}
                />
                {resetPasswordForm.formState.errors.otp && (
                  <p className="text-sm text-destructive mt-1">
                    {resetPasswordForm.formState.errors.otp.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...resetPasswordForm.register("newPassword")}
                  className="mt-1"
                />
                {resetPasswordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive mt-1">
                    {resetPasswordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={resetPassword.isPending}
              >
                {resetPassword.isPending ? "Resetting..." : "Reset Password"}
              </Button>
              <p className="text-center text-sm">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => forgotPassword.mutate(forgotPasswordForm.getValues())}
                >
                  Resend
                </button>
              </p>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}