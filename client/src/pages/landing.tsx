import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";

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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-black to-[#1a1a1a]" />

      {/* Content */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={stagger}
        className="relative z-10 container mx-auto px-4 py-20 min-h-screen flex flex-col items-center"
      >
        <motion.h1 
          variants={fadeIn}
          className="text-6xl md:text-7xl font-bold text-center mb-6 text-white"
        >
          Chat with Anime Characters
        </motion.h1>

        <motion.p 
          variants={fadeIn}
          className="text-lg text-center text-gray-300 mb-12"
        >
          Experience immersive conversations with your favorite anime characters 
          powered by advanced AI technology.
        </motion.p>

        <motion.div className="flex justify-center">
          <Link to="/chats">
            <Button 
              size="lg" 
              className="text-white bg-blue-600 hover:bg-blue-700 transition-colors rounded-md px-8 py-3"
            >
              Start Chatting Now 
            </Button>
          </Link>
        </motion.div>

        <motion.div 
          variants={fadeIn}
          className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-24 w-full max-w-5xl mx-auto"
        >
          {/* Multiple Characters */}
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Multiple Characters</h3>
            <p className="text-gray-400">Chat with a diverse cast of anime characters, each with their own unique personality and backstory.</p>
          </div>

          {/* AI-Powered Responses */}
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2m0 2a8 8 0 0 0-8 8c0 4.418 3.582 8 8 8s8-3.582 8-8c0-4.418-3.582-8-8-8"></path>
                  <path d="M12 6v6l4 2"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">AI-Powered Responses</h3>
            <p className="text-gray-400">Experience natural conversations powered by advanced language models that maintain character authenticity.</p>
          </div>

          {/* Real-time Chat */}
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Real-time Chat</h3>
            <p className="text-gray-400">Enjoy instant responses and seamless conversation flow with our real-time chat interface.</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}