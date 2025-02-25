import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/navigation";
import Home from "@/pages/home";
import Chat from "@/pages/chat";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
    staleTime: 0,
  });

  if (!user?.isAdmin) {
    window.location.href = "/admin/login";
    return null;
  }

  return <Component />;
}

function Router() {
  const { toast } = useToast();

  // Check user status periodically
  useQuery({
    queryKey: ["/api/check-status"],
    refetchInterval: 5000, // Check every 5 seconds
    retry: false,
    onError: (error: any) => {
      if (error.response?.status === 403) {
        // User is blocked, show message and force logout
        toast({
          variant: "destructive",
          title: "Account Blocked",
          description: "Your account has been blocked. Please contact support."
        });
        // Perform logout
        fetch("/api/logout", { method: "POST" }).finally(() => {
          queryClient.clear();
          window.location.href = "/";
        });
      }
    }
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
    staleTime: 0,
  });

  return (
    <>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/chats">
          <>
            <Navigation />
            <Home />
          </>
        </Route>
        <Route path="/chat/:characterId" component={Chat} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/dashboard">
          <AdminRoute component={AdminDashboard} />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;