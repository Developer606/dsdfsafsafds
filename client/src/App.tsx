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
import type { User } from "@shared/schema";

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"]
  });

  if (!user?.isAdmin) {
    return <Route path="/admin/*" component={() => {
      window.location.href = "/admin/login";
      return null;
    }} />;
  }

  return <Component />;
}

function Router() {
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