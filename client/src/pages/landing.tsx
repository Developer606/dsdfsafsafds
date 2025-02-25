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
import { FaEnvelope, FaGithub, FaTwitter } from "react-icons/fa";
import { PolicyDialog } from "@/components/policy-dialog";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const slideIn = {
  initial: { x: -60, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  transition: { duration: 0.8, ease: "easeOut" },
};

// Featured characters data
const FEATURED_CHARACTERS = [
  {
    name: "Naruto Uzumaki",
    description:
      "The determined ninja who never gives up! Join him on his journey to become the greatest Hokage.",
    image:
      "https://img.goodfon.com/original/1920x1080/b/7d/naruto-naruto-naruto-uzumaki-ulybka-paren.jpg", // Replace with actual Naruto image
    color: "from-orange-500 to-red-500",
  },
  {
    name: "Sakura Haruno",
    description:
      "Skilled medical ninja with incredible strength. A powerful kunoichi from the Hidden Leaf Village.",
    image:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/151.png", // Replace with actual Sakura image
    color: "from-pink-500 to-red-400",
  },
  {
    name: "Sasuke Uchiha",
    description:
      "Last survivor of the Uchiha clan, seeking to restore honor to his family name.",
    image:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png", // Replace with actual Sasuke image
    color: "from-purple-600 to-blue-500",
  },
];

// Move policy content outside component for better performance
const POLICY_CONTENT = {
  return: (
    <>
      <h2>Return Policy</h2>
      <p>
        As AnimeChat AI provides digital services, we do not offer traditional
        returns. However, if you're experiencing technical issues or have
        concerns about our service, please contact our support team at
        support@animechat.ai.
      </p>

      <h3>Digital Content and Services</h3>
      <ul>
        <li>All purchases are considered final once the service is accessed</li>
        <li>Premium features are non-transferable</li>
        <li>Account access cannot be returned or transferred</li>
      </ul>
    </>
  ),
  refund: (
    <>
      <h2>Refund Policy</h2>
      <p>
        We strive to provide the best possible experience with our AI chat
        service. Our refund policy is designed to be fair and transparent.
      </p>

      <h3>Eligibility for Refunds</h3>
      <ul>
        <li>Service unavailability exceeding 24 hours</li>
        <li>Technical issues preventing access to premium features</li>
        <li>Billing errors or unauthorized charges</li>
      </ul>

      <p>
        To request a refund, please contact our support team with your account
        details and reason for the refund request.
      </p>
    </>
  ),
  privacy: (
    <>
      <h2>Privacy Policy</h2>
      <p>
        Your privacy is important to us. This policy outlines how we collect,
        use, and protect your personal information.
      </p>

      <h3>Data Collection</h3>
      <ul>
        <li>Account information (email, username)</li>
        <li>Chat history and interactions</li>
        <li>Usage statistics and preferences</li>
      </ul>

      <h3>Data Protection</h3>
      <p>
        We employ industry-standard security measures to protect your personal
        information and ensure data privacy.
      </p>
    </>
  ),
  about: (
    <>
      <h2>About AnimeChat AI</h2>
      <p>
        AnimeChat AI is an innovative platform that brings your favorite anime
        characters to life through advanced artificial intelligence.
      </p>

      <h3>Our Mission</h3>
      <p>
        We aim to create meaningful and engaging conversations between users and
        AI-powered anime characters, providing a unique and immersive experience
        for anime fans worldwide.
      </p>

      <h3>Technology</h3>
      <p>
        Our platform utilizes state-of-the-art language models and character
        development techniques to ensure authentic and engaging interactions.
      </p>
    </>
  ),
  disclaimer: (
    <>
      <h2>Disclaimer</h2>
      <p>Please read this disclaimer carefully before using our service.</p>

      <h3>AI-Generated Content</h3>
      <ul>
        <li>
          Characters and responses are AI-generated and may not always be
          accurate
        </li>
        <li>Conversations are simulated and for entertainment purposes only</li>
        <li>We do not guarantee specific outcomes or experiences</li>
      </ul>

      <h3>User Responsibility</h3>
      <p>
        Users are responsible for their interactions and should use the service
        appropriately and in accordance with our terms of service.
      </p>
    </>
  ),
};

export default function LandingPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState<
    keyof typeof POLICY_CONTENT | null
  >(null);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
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

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const feedbackData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      message: formData.get("message") as string,
    };

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      toast({
        title: "Success",
        description: "Thank you for your feedback! We'll get back to you soon.",
      });
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-blue-900/20">
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
        <motion.div variants={slideIn} className="text-center mb-8">
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
            Experience immersive conversations with your favorite anime
            characters powered by advanced AI technology.
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-blue-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Multiple Characters
            </h3>
            <p className="text-gray-400">
              Chat with a diverse cast of anime characters, each with their own
              unique personality and backstory.
            </p>
          </motion.div>

          <motion.div
            className="text-center"
            whileHover={{ y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-purple-500/30 transform hover:rotate-12 transition-transform duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-purple-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2m0 2a8 8 0 0 0-8 8c0 4.418 3.582 8 8 8s8-3.582 8-8c0-4.418-3.582-8-8-8"></path>
                  <path d="M12 6v6l4 2"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              AI-Powered Responses
            </h3>
            <p className="text-gray-400">
              Experience natural conversations powered by advanced language
              models that maintain character authenticity.
            </p>
          </motion.div>

          <motion.div
            className="text-center"
            whileHover={{ y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-blue-500/30 transform hover:rotate-12 transition-transform duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-blue-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Real-time Chat
            </h3>
            <p className="text-gray-400">
              Enjoy instant responses and seamless conversation flow with our
              real-time chat interface.
            </p>
          </motion.div>
        </motion.div>

        {/* New Featured Characters Section */}
        <motion.div
          variants={fadeIn}
          className="w-full max-w-7xl mx-auto mt-32"
        >
          <motion.h2
            variants={fadeIn}
            className="text-4xl font-bold text-center text-white mb-12"
          >
            Featured Characters
          </motion.h2>
          <motion.div
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {FEATURED_CHARACTERS.map((character, index) => (
              <motion.div
                key={character.name}
                variants={fadeIn}
                whileHover={{ y: -10, scale: 1.02 }}
                className="relative group"
              >
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/5 to-white/10 p-1">
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 {character.color}" />
                  <div className="relative bg-black/40 backdrop-blur-sm rounded-lg p-6 h-full">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.2 }}
                    >
                      <img
                        src={character.image}
                        alt={character.name}
                        className="w-full h-64 object-cover rounded-lg mb-4 transform group-hover:scale-105 transition-transform duration-500"
                      />
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {character.name}
                      </h3>
                      <p className="text-gray-300">{character.description}</p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleStartChatting}
                        className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 w-full"
                      >
                        Chat Now
                      </motion.button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          variants={fadeIn}
          className="w-full max-w-2xl mx-auto mt-32 bg-white/5 backdrop-blur-lg rounded-xl p-8 border border-white/10"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Share Your Feedback
          </h2>
          <form onSubmit={handleSubmitFeedback} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Name
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Your name"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Message
              </label>
              <Textarea
                id="message"
                name="message"
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

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 w-full bg-black/30 backdrop-blur-sm border-t border-white/10 py-8 mt-20"
      >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold text-white mb-2">
                Contact Us
              </h3>
              <div className="flex flex-col space-y-2 items-center md:items-start">
                <a
                  href="mailto:support@animechat.ai"
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <FaEnvelope className="w-4 h-4" />
                  support@animechat.ai
                </a>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-400 mb-4">
                © {new Date().getFullYear()} AnimeChat AI. All rights reserved.
              </p>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
                <button
                  onClick={() => setCurrentPolicy("return")}
                  className="hover:text-white transition-colors"
                >
                  Return Policy
                </button>
                <button
                  onClick={() => setCurrentPolicy("refund")}
                  className="hover:text-white transition-colors"
                >
                  Refund Policy
                </button>
                <button
                  onClick={() => setCurrentPolicy("privacy")}
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </button>
                <button
                  onClick={() => setCurrentPolicy("about")}
                  className="hover:text-white transition-colors"
                >
                  About
                </button>
                <button
                  onClick={() => setCurrentPolicy("disclaimer")}
                  className="hover:text-white transition-colors"
                >
                  Disclaimer
                </button>
              </div>
            </div>

            <div className="text-center md:text-right">
              <h3 className="text-lg font-semibold text-white mb-2">
                Follow Us
              </h3>
              <div className="flex justify-center md:justify-end space-x-4">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FaTwitter className="w-5 h-5" />
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FaGithub className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.footer>

      <PolicyDialog
        open={currentPolicy !== null}
        onOpenChange={(open) => !open && setCurrentPolicy(null)}
        title={
          currentPolicy
            ? `${currentPolicy.charAt(0).toUpperCase()}${currentPolicy.slice(1)} Policy`
            : ""
        }
        content={currentPolicy ? POLICY_CONTENT[currentPolicy] : null}
      />

      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onSuccess={handleSuccessfulAuth}
      />
    </div>
  );
}