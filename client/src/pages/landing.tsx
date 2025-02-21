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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80')",
        }}
      />

      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/95 via-indigo-900/95 to-blue-900/95 animate-gradient-shift" />

      {/* Floating particles effect */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDYwIEwgNjAgMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20 animate-float" />

      {/* Content */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={stagger}
        className="relative z-10 container mx-auto px-4 py-20 min-h-screen flex flex-col justify-center items-center text-center"
      >
        <motion.h1 
          variants={fadeIn}
          className="text-6xl md:text-7xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-pink-200"
        >
          AI Anime Character Chat
        </motion.h1>

        <motion.p 
          variants={fadeIn}
          className="text-xl text-gray-200 mb-12 max-w-2xl leading-relaxed"
        >
          Experience immersive conversations with your favorite anime characters in multiple languages. Our AI-powered chat system brings characters to life with natural, context-aware responses.
        </motion.p>

        <motion.div 
          variants={fadeIn}
          className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 max-w-4xl w-full mb-12"
        >
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="space-y-4 text-left bg-white/10 p-8 rounded-xl backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all duration-300"
          >
            <h3 className="text-2xl font-semibold text-white">Key Features</h3>
            <ul className="space-y-3 text-gray-200">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                Multiple language support
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                Character-authentic responses
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                Natural conversations
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                Custom character creation
              </li>
            </ul>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="space-y-4 text-left bg-white/10 p-8 rounded-xl backdrop-blur-sm border border-white/20 hover:bg-white/15 transition-all duration-300"
          >
            <h3 className="text-2xl font-semibold text-white">Supported Languages</h3>
            <ul className="space-y-3 text-gray-200">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-pink-400 rounded-full"></span>
                English
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-pink-400 rounded-full"></span>
                Japanese
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-pink-400 rounded-full"></span>
                Chinese
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-pink-400 rounded-full"></span>
                Korean & more
              </li>
            </ul>
          </motion.div>
        </motion.div>

        <motion.div variants={fadeIn}>
          <Link href="/chats">
            <Button 
              size="lg" 
              className="mt-8 text-lg px-12 py-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 rounded-full"
            >
              Start Chatting Now
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}