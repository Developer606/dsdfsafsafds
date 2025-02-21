import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Users, Sparkles, Crown } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-500 text-transparent bg-clip-text">
            Anime Character Chat
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Create and chat with your favorite anime characters using AI technology
          </p>
          <Link href="/home">
            <Button size="lg" className="animate-pulse">
              Start Chatting Now
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-6 text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-purple-500" />
              <h3 className="text-xl font-semibold mb-2">Interactive Chat</h3>
              <p className="text-muted-foreground">
                Engage in meaningful conversations with AI-powered anime characters
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-blue-500" />
              <h3 className="text-xl font-semibold mb-2">Custom Characters</h3>
              <p className="text-muted-foreground">
                Create and customize your own unique anime characters
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-6 text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
              <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
              <p className="text-muted-foreground">
                Advanced AI ensures characters maintain their unique personalities
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-6 text-center">
              <Crown className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-semibold mb-2">Premium Features</h3>
              <p className="text-muted-foreground">
                Unlock unlimited character creation with premium subscription
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start?</h2>
          <p className="text-muted-foreground mb-8">
            Join now and start chatting with your favorite anime characters!
          </p>
          <Link href="/home">
            <Button variant="outline" size="lg">
              Explore Characters
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
