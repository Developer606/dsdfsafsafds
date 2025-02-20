import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/home";
import Chat from "@/pages/chat";
import Characters from "@/pages/characters";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat/:characterId" component={Chat} />
      <Route path="/characters" component={Characters} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}