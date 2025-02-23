import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/navigation";
import Home from "@/pages/home";
import Chat from "@/pages/chat";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AdminDashboard from "@/pages/admin/dashboard";
import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";

function ProtectedAdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  if (!user?.isAdmin) {
    return <NotFound />;
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
        <Route path="/admin">
          <ProtectedAdminRoute component={AdminDashboard} />
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