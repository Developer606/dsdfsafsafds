import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { AuthDialog } from "@/components/auth-dialog";
import type { User } from "@shared/schema";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.2
    }
  }
};

const slideIn = {
  initial: { x: -60, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  transition: { duration: 0.8, ease: "easeOut" }
};

export default function LandingPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"]
  });

  const handleStartChatting = () => {
    if (user) {
      setLocation("/chats");
    } else {
      setShowAuthDialog(true);
    }
  };

  const handleSuccessfulAuth = () => {
    setShowAuthDialog(false);
    setLocation("/chats");
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Feedback Submitted",
      description: "Thank you for your feedback! We'll get back to you soon.",
    });
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div 
        className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-blue-900/20"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />
      </div>

      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-black/95 to-purple-900/90 animate-gradient-shift" />

      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDYwIEwgNjAgMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20 animate-float" />

      <motion.div
        initial="initial"
        animate="animate"
        variants={stagger}
        className="relative z-10 container mx-auto px-4 py-20 min-h-screen flex flex-col items-center"
      >
        <motion.div
          variants={slideIn}
          className="text-center mb-8"
        >
          <motion.h1 
            variants={fadeIn}
            className="text-6xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse"
          >
            Chat with Anime Characters
          </motion.h1>

          <motion.p 
            variants={fadeIn}
            className="text-lg text-center text-gray-300 mb-12 max-w-2xl mx-auto"
          >
            Experience immersive conversations with your favorite anime characters 
            powered by advanced AI technology.
          </motion.p>
        </motion.div>

        <motion.div 
          variants={fadeIn}
          whileHover={{ scale: 1.05 }}
          className="mb-20"
        >
          <Button 
            size="lg" 
            className="text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:shadow-lg hover:shadow-blue-500/25 rounded-xl px-8 py-4 text-lg"
            onClick={handleStartChatting}
          >
            Start Chatting Now 
          </Button>
        </motion.div>

        <motion.div 
          variants={fadeIn}
          className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-12 w-full max-w-5xl mx-auto"
        >
          <motion.div 
            className="text-center"
            whileHover={{ y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-blue-500/30 transform hover:rotate-12 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Multiple Characters</h3>
            <p className="text-gray-400">Chat with a diverse cast of anime characters, each with their own unique personality and backstory.</p>
          </motion.div>

          <motion.div 
            className="text-center"
            whileHover={{ y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-purple-500/30 transform hover:rotate-12 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2m0 2a8 8 0 0 0-8 8c0 4.418 3.582 8 8 8s8-3.582 8-8c0-4.418-3.582-8-8-8"></path>
                  <path d="M12 6v6l4 2"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">AI-Powered Responses</h3>
            <p className="text-gray-400">Experience natural conversations powered by advanced language models that maintain character authenticity.</p>
          </motion.div>

          <motion.div 
            className="text-center"
            whileHover={{ y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-blue-500/30 transform hover:rotate-12 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Real-time Chat</h3>
            <p className="text-gray-400">Enjoy instant responses and seamless conversation flow with our real-time chat interface.</p>
          </motion.div>
        </motion.div>

        <motion.div
          variants={fadeIn}
          className="w-full max-w-2xl mx-auto mt-32 bg-white/5 backdrop-blur-lg rounded-xl p-8 border border-white/10"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-8">Share Your Feedback</h2>
          <form onSubmit={handleSubmitFeedback} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Name
                </label>
                <Input
                  id="name"
                  placeholder="Your name"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                Message
              </label>
              <Textarea
                id="message"
                placeholder="Share your thoughts..."
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 min-h-[120px]"
              />
            </div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex justify-center"
            >
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl transition-all duration-300"
              >
                Submit Feedback
              </Button>
            </motion.div>
          </form>
        </motion.div>
      </motion.div>
      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onSuccess={handleSuccessfulAuth}
      />
    </div>
  );
}