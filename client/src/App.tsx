import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
// import { Navigation } from "@/components/navigation";
import Home from "@/pages/home";
import Chat from "@/pages/chat";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import ProfilePage from "@/pages/profile";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminContentModeration from "@/pages/admin-content-moderation";
import AdminCharacters from "@/pages/admin-characters";
import AdminAdvertisements from "@/pages/admin-advertisements";
import AdminUserManagement from "@/pages/admin-user-management";
import UserSearch from "@/pages/user-search";
import UserMessages from "@/pages/user-messages";
import Conversations from "@/pages/conversations";
import Library from "@/pages/library";
import { ComplaintsSection } from "@/components/complaints-section";
import { FeedbackSection } from "@/components/feedback-section";
import { NotificationSocketProvider } from "@/components/notification-socket-provider";
import { ProtectedRoute } from "./lib/protected-route";
import { ThemeProvider } from "./lib/theme-context";

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
      <ProtectedRoute path="/search" component={UserSearch} />
      <ProtectedRoute path="/messages/:userId" component={UserMessages} />
      <ProtectedRoute path="/conversations" component={Conversations} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/library" component={Library} />
      <ProtectedRoute path="/users/search" component={UserSearch} />
      <ProtectedRoute path="/user-messages/search" component={UserSearch} />
      <ProtectedRoute path="/user-messages/:userId" component={UserMessages} />

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
      <ProtectedRoute
        path="/admin/content-moderation"
        component={AdminContentModeration}
        requireAdmin
      />
      <ProtectedRoute
        path="/admin/characters"
        component={AdminCharacters}
        requireAdmin
      />
      <ProtectedRoute
        path="/admin/advertisements"
        component={AdminAdvertisements}
        requireAdmin
      />
      <ProtectedRoute
        path="/admin/users"
        component={AdminUserManagement}
        requireAdmin
      />
      <ProtectedRoute
        path="/admin/user-management"
        component={AdminUserManagement}
        requireAdmin
      />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NotificationSocketProvider>
          <Router />
          <Toaster />
        </NotificationSocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
