import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
// import { Navigation } from "@/components/navigation";
import Home from "@/pages/home";
import Chat from "@/pages/chat";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import { ComplaintsSection } from "@/components/complaints-section";
import { FeedbackSection } from "@/components/feedback-section";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/admin/login" component={AdminLogin} />

      {/* Protected routes that require authentication */}
      <ProtectedRoute
        path="/chats"
        component={() => (
          <>
            {/* <Navigation /> */}
            <Home />
          </>
        )}
      />
      <ProtectedRoute path="/chat/:characterId" component={Chat} />

      {/* Admin-only routes */}
      <ProtectedRoute
        path="/admin/dashboard"
        component={AdminDashboard}
        requireAdmin
      />
      <ProtectedRoute
        path="/admin/dashboard/complaints"
        component={ComplaintsSection}
        requireAdmin
      />
      <ProtectedRoute
        path="/admin/dashboard/feedback"
        component={FeedbackSection}
        requireAdmin
      />

      <Route component={NotFound} />
    </Switch>
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
