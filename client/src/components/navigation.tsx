import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Users } from "lucide-react";

export function Navigation() {
  const [location] = useLocation();

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center gap-4">
          <Link href="/">
            <a className={location === "/" ? "text-primary" : "text-muted-foreground"}>
              <Button variant="ghost" className="gap-2">
                <Home className="h-4 w-4" />
                Home
              </Button>
            </a>
          </Link>
          <Link href="/characters">
            <a className={location === "/characters" ? "text-primary" : "text-muted-foreground"}>
              <Button variant="ghost" className="gap-2">
                <Users className="h-4 w-4" />
                Characters
              </Button>
            </a>
          </Link>
        </div>
      </div>
    </nav>
  );
}
