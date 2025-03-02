import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import type { User } from "@shared/schema";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
  requireAdmin?: boolean;
}

export function ProtectedRoute({
  path,
  component: Component,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
  });

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user || (requireAdmin && !user.isAdmin)) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}