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

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

type RegistrationStep = 'initial' | 'verify-otp';

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>('initial');
  const [registrationEmail, setRegistrationEmail] = useState("");
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

  const sendOTP = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/verify/send-otp", { email });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send OTP");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "OTP sent to your email",
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
    mutationFn: async (data: { email: string; otp: string }) => {
      const res = await apiRequest("POST", "/api/verify/verify-otp", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "OTP verification failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email verified successfully",
      });
      // Proceed with registration
      const formData = registerForm.getValues();
      register.mutate(formData);
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
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Success",
        description: "Registered successfully",
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

  const handleRegistrationSubmit = async (data: { username: string; email: string; password: string }) => {
    setRegistrationEmail(data.email);
    try {
      await sendOTP.mutateAsync(data.email);
      setRegistrationStep('verify-otp');
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleOTPSubmit = async (data: { otp: string }) => {
    try {
      await verifyOTP.mutateAsync({ email: registrationEmail, otp: data.otp });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleDialogClose = () => {
    setRegistrationStep('initial');
    setRegistrationEmail("");
    registerForm.reset();
    otpForm.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isLogin ? "Login to Your Account" : (
              registrationStep === 'initial' ? "Create an Account" : "Verify Email"
            )}
          </DialogTitle>
        </DialogHeader>

        {isLogin ? (
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
              <p className="text-center text-sm">
                Don't have an account?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setIsLogin(false)}
                >
                  Sign up
                </button>
              </p>
            </div>
          </form>
        ) : registrationStep === 'initial' ? (
          <form onSubmit={registerForm.handleSubmit(handleRegistrationSubmit)}>
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
                disabled={sendOTP.isPending}
              >
                {sendOTP.isPending ? "Sending OTP..." : "Create Account"}
              </Button>
              <p className="text-center text-sm">
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setIsLogin(true)}
                >
                  Login
                </button>
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={otpForm.handleSubmit(handleOTPSubmit)}>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Please enter the verification code sent to your email address
              </p>
              <div>
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  {...otpForm.register("otp")}
                  className="mt-1 text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                />
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
                  onClick={() => sendOTP.mutate(registrationEmail)}
                  disabled={sendOTP.isPending}
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