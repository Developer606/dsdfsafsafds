import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";

export function Navigation() {
  const [location] = useLocation();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"]
  });

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center gap-4">
          <Link href="/chats">
            <a className={location === "/chats" ? "text-primary" : "text-muted-foreground"}>
              <Button variant="ghost" className="gap-2">
                <Home className="h-4 w-4" />
                Home
              </Button>
            </a>
          </Link>
        </div>
      </div>
    </nav>
  );
}