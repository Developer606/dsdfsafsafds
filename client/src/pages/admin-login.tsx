import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminLoginSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      username: "",
      password: "",
      isAdmin: true,
    },
  });

  const login = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/admin/login", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Admin login failed");
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Success",
        description: "Admin logged in successfully",
      });
      setLocation("/admin/dashboard");
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-muted-foreground">
            Access the admin dashboard
          </p>
        </div>

        <form onSubmit={form.handleSubmit((data) => login.mutate(data))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              {...form.register("username")}
              className="w-full"
            />
            {form.formState.errors.username && (
              <p className="text-sm text-destructive">
                {form.formState.errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...form.register("password")}
              className="w-full"
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={login.isPending}
          >
            {login.isPending ? "Logging in..." : "Login as Admin"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
