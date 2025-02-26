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
import { InputOTP, InputOTPGroup } from "@/components/ui/input-otp";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

type AuthState = "login" | "register" | "verify-otp" | "forgot-password" | "reset-password";

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
  const [authState, setAuthState] = useState<AuthState>("login");
  const [email, setEmail] = useState("");
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
    defaultValues: {
      otp: "",
    },
  });

  const forgotPasswordForm = useForm({
    defaultValues: {
      email: "",
    },
  });

  const resetPasswordForm = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
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
      setEmail(registerForm.getValues("email"));
      setAuthState("verify-otp");
      toast({
        title: "Success",
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

  const verifyOTP = useMutation({
    mutationFn: async (otp: string) => {
      const res = await apiRequest("POST", "/api/verify-email", { email, otp });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Verification failed");
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
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

  const requestPasswordReset = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/request-password-reset", { email });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Password reset request failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setEmail(forgotPasswordForm.getValues("email"));
      setAuthState("verify-otp");
      toast({
        title: "Success",
        description: "Please check your email for the reset code",
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
    mutationFn: async (data: { password: string; otp: string }) => {
      const res = await apiRequest("POST", "/api/reset-password", { 
        email,
        password: data.password,
        otp: data.otp
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Password reset failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setAuthState("login");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {authState === "login" && "Login to Your Account"}
            {authState === "register" && "Create an Account"}
            {authState === "verify-otp" && "Verify Your Email"}
            {authState === "forgot-password" && "Reset Your Password"}
            {authState === "reset-password" && "Enter New Password"}
          </DialogTitle>
        </DialogHeader>

        {authState === "login" && (
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
                <p className="text-sm">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setAuthState("register")}
                  >
                    Sign up
                  </button>
                </p>
                <p className="text-sm">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setAuthState("forgot-password")}
                  >
                    Forgot password?
                  </button>
                </p>
              </div>
            </div>
          </form>
        )}

        {authState === "register" && (
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
                  onClick={() => setAuthState("login")}
                >
                  Login
                </button>
              </p>
            </div>
          </form>
        )}

        {authState === "verify-otp" && (
          <form onSubmit={otpForm.handleSubmit((data) => verifyOTP.mutate(data.otp))}>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Enter the verification code sent to {email}
                </p>
              </div>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  render={({ slots }) => (
                    <InputOTPGroup>
                      {slots.map((slot, index) => (
                        <Input
                          key={index}
                          {...slot}
                          className="w-10"
                        />
                      ))}
                    </InputOTPGroup>
                  )}
                  {...otpForm.register("otp")}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={verifyOTP.isPending}
              >
                {verifyOTP.isPending ? "Verifying..." : "Verify Email"}
              </Button>
            </div>
          </form>
        )}

        {authState === "forgot-password" && (
          <form onSubmit={forgotPasswordForm.handleSubmit((data) => requestPasswordReset.mutate(data.email))}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...forgotPasswordForm.register("email")}
                  className="mt-1"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={requestPasswordReset.isPending}
              >
                {requestPasswordReset.isPending ? "Sending..." : "Send Reset Code"}
              </Button>
              <p className="text-center text-sm">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setAuthState("login")}
                >
                  Back to login
                </button>
              </p>
            </div>
          </form>
        )}

        {authState === "reset-password" && (
          <form onSubmit={resetPasswordForm.handleSubmit((data) => 
            resetPassword.mutate({ 
              password: data.password,
              otp: otpForm.getValues("otp")
            })
          )}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...resetPasswordForm.register("password")}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...resetPasswordForm.register("confirmPassword")}
                  className="mt-1"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={resetPassword.isPending}
              >
                {resetPassword.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}