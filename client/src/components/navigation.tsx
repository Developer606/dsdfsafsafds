import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Crown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";
import { useState } from "react";
import { SubscriptionDialog } from "@/components/subscription-dialog";

export function Navigation() {
  const [location] = useLocation();
  const [showSubscription, setShowSubscription] = useState(false);

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

          {!user?.isPremium && (
            <Button
              variant="default"
              className="ml-auto gap-2"
              onClick={() => setShowSubscription(true)}
            >
              <Crown className="h-4 w-4" />
              Upgrade to Premium
            </Button>
          )}
        </div>
      </div>

      <SubscriptionDialog
        open={showSubscription}
        onClose={() => setShowSubscription(false)}
      />
    </nav>
  );
}