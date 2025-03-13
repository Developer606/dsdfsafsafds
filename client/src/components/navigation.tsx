import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { type User as UserType } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function Navigation() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user } = useQuery<UserType>({
    queryKey: ["/api/user"]
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include"
      });

      // Clear all queries from the cache
      queryClient.clear();

      // Navigate to landing page
      setLocation("/");

      toast({
        title: "Logged out successfully",
        description: "Come back soon!"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to logout. Please try again."
      });
    }
  };

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Home icon and link removed */}
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="rounded-full h-8 w-8"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}