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
import { insertUserSchema, loginSchema, verifyEmailSchema, resetPasswordSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

type AuthMode = "login" | "register" | "verify-email" | "forgot-password" | "reset-password";

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [pendingEmail, setPendingEmail] = useState("");
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

  const verifyEmailForm = useForm({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: pendingEmail,
      otp: "",
    },
  });

  const resetPasswordForm = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: pendingEmail,
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

  const register = useMutation({
    mutationFn: async (data: { username: string; email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/register", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (response) => {
      toast({
        title: "Success",
        description: "Registration successful. Please verify your email.",
      });
      setPendingEmail(registerForm.getValues().email);
      setMode("verify-email");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const verifyEmail = useMutation({
    mutationFn: async (data: { email: string; otp: string }) => {
      const res = await apiRequest("POST", "/api/verify-email", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Verification failed");
      }
      return res.json();
    },
    onSuccess: (response) => {
      toast({
        title: "Success",
        description: "Email verified successfully",
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
      const res = await apiRequest("POST", "/api/forgot-password", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send reset code");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "If the email exists, a reset code will be sent",
      });
      setMode("reset-password");
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
      const res = await apiRequest("POST", "/api/reset-password", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Password reset failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password reset successful. Please login.",
      });
      setMode("login");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const renderForm = () => {
    switch (mode) {
      case "login":
        return (
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
              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setMode("register")}
                >
                  Create account
                </button>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    setPendingEmail("");
                    setMode("forgot-password");
                  }}
                >
                  Forgot password?
                </button>
              </div>
            </div>
          </form>
        );

      case "register":
        return (
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
                  onClick={() => setMode("login")}
                >
                  Login
                </button>
              </p>
            </div>
          </form>
        );

      case "verify-email":
        return (
          <form onSubmit={verifyEmailForm.handleSubmit((data) => verifyEmail.mutate(data))}>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please enter the verification code sent to your email.
              </p>
              <div>
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  {...verifyEmailForm.register("otp")}
                  className="mt-1"
                  autoComplete="off"
                />
                {verifyEmailForm.formState.errors.otp && (
                  <p className="text-sm text-destructive mt-1">
                    {verifyEmailForm.formState.errors.otp.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={verifyEmail.isPending}
              >
                {verifyEmail.isPending ? "Verifying..." : "Verify Email"}
              </Button>
            </div>
          </form>
        );

      case "forgot-password":
        return (
          <form onSubmit={(e) => {
            e.preventDefault();
            const email = (e.target as HTMLFormElement).email.value;
            setPendingEmail(email);
            forgotPassword.mutate({ email });
          }}>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your email address to receive a password reset code.
              </p>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  required
                  className="mt-1"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={forgotPassword.isPending}
              >
                {forgotPassword.isPending ? "Sending..." : "Send Reset Code"}
              </Button>
              <p className="text-center text-sm">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setMode("login")}
                >
                  Back to Login
                </button>
              </p>
            </div>
          </form>
        );

      case "reset-password":
        return (
          <form onSubmit={resetPasswordForm.handleSubmit((data) => resetPassword.mutate(data))}>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the reset code sent to your email and your new password.
              </p>
              <div>
                <Label htmlFor="otp">Reset Code</Label>
                <Input
                  id="otp"
                  {...resetPasswordForm.register("otp")}
                  className="mt-1"
                  autoComplete="off"
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
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setMode("login")}
                >
                  Back to Login
                </button>
              </p>
            </div>
          </form>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "login" && "Login to Your Account"}
            {mode === "register" && "Create an Account"}
            {mode === "verify-email" && "Verify Your Email"}
            {mode === "forgot-password" && "Forgot Password"}
            {mode === "reset-password" && "Reset Password"}
          </DialogTitle>
        </DialogHeader>
        {renderForm()}
      </DialogContent>
    </Dialog>
  );
}