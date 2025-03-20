import { useState, lazy, Suspense, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import {
  FaEnvelope,
  FaGithub,
  FaTwitter,
  FaInstagram,
  FaComment,
} from "react-icons/fa";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Lazy load components
const AuthDialog = lazy(() =>
  import("@/components/auth-dialog").then((module) => ({
    default: module.AuthDialog,
  })),
);

const PolicyDialog = lazy(() =>
  import("@/components/policy-dialog").then((module) => ({
    default: module.PolicyDialog,
  })),
);

const TypeWriter = lazy(() =>
  import("@/components/type-writer").then((module) => ({
    default: module.TypeWriter,
  })),
);

// Animations
const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.4 },
};

const slideIn = {
  initial: { x: -30, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  transition: { duration: 0.5 },
};

// Featured characters data
const FEATURED_CHARACTERS = [
  {
    name: "Naruto Uzumaki",
    description:
      "The determined ninja who never gives up! Join him on his journey to become the greatest Hokage.",
    image: "/images/characters/naruto.png",
    color: "from-orange-500 to-red-500",
  },
  {
    name: "Sakura Haruno",
    description:
      "Skilled medical ninja with incredible strength. A powerful kunoichi from the Hidden Leaf Village.",
    image: "/images/characters/sakura.png",
    color: "from-pink-500 to-red-400",
  },
  {
    name: "Sasuke Uchiha",
    description:
      "Last survivor of the Uchiha clan, seeking to restore honor to his family name.",
    image: "/images/characters/sasuke.png",
    color: "from-purple-600 to-blue-500",
  },
];

// Add background images array after FEATURED_CHARACTERS
const BACKGROUND_IMAGES = [
  "/images/gerrn_image-removebg-preview.png",
  "/images/image (1).png",
  "/images/image.png",
];

export default function LandingPage() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState<
    keyof typeof POLICY_CONTENT | null
  >(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false); // Added state for feedback dialog
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
          <li>
            All purchases are considered final once the service is accessed
          </li>
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
          We aim to create meaningful and engaging conversations between users
          and AI-powered anime characters, providing a unique and immersive
          experience for anime fans worldwide.
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
          <li>
            Conversations are simulated and for entertainment purposes only
          </li>
          <li>We do not guarantee specific outcomes or experiences</li>
        </ul>

        <h3>User Responsibility</h3>
        <p>
          Users are responsible for their interactions and should use the
          service appropriately and in accordance with our terms of service.
        </p>
      </>
    ),
  };

  // Add image transition effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === BACKGROUND_IMAGES.length - 1 ? 0 : prevIndex + 1,
      );
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {isMobile ? (
        // Mobile UI with video background
        <div className="min-h-screen flex flex-col">
          <div className="fixed inset-0">
            <video
              src="/images/backgrounds/videos.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col min-h-screen">
            <div className="flex-1 p-6 flex flex-col">
              <div className="mb-auto pt-8">
                <h1 className="text-4xl font-bold text-white mb-2">
                  AnimeChat AI
                </h1>
                <p className="text-lg text-gray-200">
                  Chat with your favorite anime characters
                </p>
              </div>

              <div className="absolute top-[36%] right-5 transform -translate-y-1/2">
                <div className="relative">
                  <div className="max-w-[200px] text-right">
                    <Suspense fallback={<div>Loading...</div>}>
                      <TypeWriter
                        text={[
                          "Hi there! 👋",
                          "Want to chat with me?",
                          "I'm an anime character!",
                          "Let's talk about anime...",
                          "What's your favorite show?",
                        ]}
                        speed={40}
                        className="text-white font-medium text-xl drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]"
                      />
                    </Suspense>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <button
                  className="absolute top-[50%] right-[50%] transform translate-x-1/2 -translate-y-1/2 w-40 h-12 bg-[#FF6584] text-white font-bold text-lg rounded-lg shadow-lg hover:bg-[#ff4f73] transition-all"
                  onClick={handleStartChatting}
                >
                  Start Chatting
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Desktop UI with AnimeCon-inspired design
        <div className="min-h-screen bg-[#0A0F1F] relative overflow-hidden">
          {/* Curved background shape */}
          <div className="absolute inset-0">
            <svg
              className="absolute h-[210vh] w-[320vh] left-[0vh] top-[-96vh]  bottome-[0vh] write-[20vh]"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path
                d="M0,0 C40,0 40,100 0,100"
                fill="#1B2340"
                className="opacity-60"
              />
            </svg>
          </div>

          {/* Decorative patterns */}
          <div className="absolute top-0 right-0 p-8">
            <div className="grid grid-cols-3 gap-2">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-[#FF6584]" />
              ))}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 p-12">
            <div className="grid grid-cols-4 gap-2">
              {[...Array(8)].map((i, _) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-white opacity-50"
                />
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="relative z-10 container mx-auto px-4">
            <div className="flex justify-end items-center pt-6">
              <div className="flex items-center space-x-2">
                <span className="text-white font-bold text-lg uppercase tracking-wider">
                  AnimeChat AI
                </span>
                <svg
                  className="w-4 h-4 text-[#FF6584]"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>

            {/* Replace the static background image with animated slideshow */}
            <div className="absolute left-[-95vh] top-[0%] w-[240vh] h-[100vh]">
              <motion.img
                key={currentImageIndex}
                src={BACKGROUND_IMAGES[currentImageIndex]}
                alt="Anime Character"
                className="w-full h-full object-contain"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
              />
            </div>

            <motion.div
              initial="initial"
              animate="animate"
              variants={fadeIn}
              className="flex min-h-[calc(100vh-80px)] items-center"
            >
              <div className="max-w-2xl">
                <motion.h1
                  variants={slideIn}
                  className="text- text-[3.7vw] font-black text-white uppercase  absolute left-[44vw] top-[8vw] "
                >
                  Chat with Anime
                </motion.h1>
                <motion.p
                  variants={slideIn}
                  className="text-[#FF6584] text-2xl font-medium mb-8 absolute left-[55vw] top-[17vw] transform -translate-x-1/2"
                >
                  <div className="relative">
                    <div className="max-w-[300px] text-left">
                      <Suspense fallback={<div>Loading...</div>}>
                        <TypeWriter
                          text={[
                            "AI-Powered Conversations",
                            "Experience the Future",
                            "Talk with Smart AI!",
                          ]}
                          speed={40}
                          className="text-[#FF6584] font-medium text-2xl"
                        />
                      </Suspense>
                    </div>
                  </div>
                </motion.p>

                <motion.button
                  variants={slideIn}
                  className="bg-[#FF6584] text-white font-bold uppercase py-4 px-8 rounded-full text-lg hover:bg-[#ff4f73] transition-colors absolute left-[56vw] top-[25vw] transform -translate-x-1/2"
                  onClick={handleStartChatting}
                >
                  Start Chatting Now
                </motion.button>
              </div>
            </motion.div>

            {/* Featured Characters */}
            {/* <motion.div
              variants={fadeIn}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16"
            >
              {FEATURED_CHARACTERS.map((character) => (
                <div
                  key={character.name}
                  className="bg-[#1B2340] rounded-lg p-6 hover:transform hover:scale-105 transition-transform duration-300"
                >
                  <h3 className="text-white text-xl font-bold mb-2">
                    {character.name}
                  </h3>
                  <p className="text-gray-300 mb-4">{character.description}</p>
                  <button
                    className="bg-[#FF6584] text-white px-4 py-2 rounded-full hover:bg-[#ff4f73] transition-colors"
                    onClick={handleStartChatting}
                  >
                    Chat Now
                  </button>
                </div>
              ))}
            </motion.div> */}

            {/* Feedback Dialog */}
            <Dialog
              open={showFeedbackDialog}
              onOpenChange={setShowFeedbackDialog}
            >
              <DialogContent className="bg-[#0A0F1F] border-blue-500/20">
                <DialogHeader>
                  <DialogTitle className="text-blue-300">
                    Share Your Feedback
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitFeedback} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-blue-300 mb-2"
                      >
                        Name
                      </label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Your name"
                        required
                        className="bg-blue-900/10 border-blue-500/20 text-blue-100 placeholder:text-blue-400/50 focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-blue-300 mb-2"
                      >
                        Email
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        required
                        className="bg-blue-900/10 border-blue-500/20 text-blue-100 placeholder:text-blue-400/50 focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-blue-300 mb-2"
                    >
                      Message
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Share your thoughts..."
                      required
                      className="bg-blue-900/10 border-blue-500/20 text-blue-100 placeholder:text-blue-400/50 focus:border-cyan-500 min-h-[120px]"
                    />
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex justify-center"
                  >
                    <Button
                      type="submit"
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-3 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(0,149,255,0.3)] hover:shadow-[0_0_30px_rgba(0,149,255,0.5)]"
                    >
                      Send Feedback
                    </Button>
                  </motion.div>
                </form>
              </DialogContent>
            </Dialog>
            <div className="absolute top-8 right-[30vh] flex items-center space-x-4 text-[#FF6584]">
              <div className="text-center">
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-blue-400/80">
                  {Object.keys(POLICY_CONTENT).map((policy) => (
                    <button
                      key={policy}
                      onClick={() =>
                        setCurrentPolicy(policy as keyof typeof POLICY_CONTENT)
                      }
                      className="hover:text-cyan-400 transition-colors"
                    >
                      {policy.charAt(0).toUpperCase() + policy.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-blue-400/80 mb-4">
                © {new Date().getFullYear()} AnimeChat AI. All rights reserved.
              </p>
            </div>

            {/* Social Links */}
            <div className="absolute bottom-8 right-8 flex items-center space-x-4 text-[#FF6584]">
              <motion.button
                onClick={() => setShowFeedbackDialog(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaComment className="w-10 h-10 cursor-pointer hover:text-white transition-colors" />
              </motion.button>
              <FaTwitter className="w-10 h-10 cursor-pointer hover:text-white transition-colors" />
              <FaInstagram className="w-10 h-10 cursor-pointer hover:text-white transition-colors" />
              <FaGithub className="w-10 h-10 cursor-pointer hover:text-white transition-colors" />
            </div>
          </div>
        </div>
      )}

      {/* Auth Dialog */}
      <Suspense fallback={null}>
        {showAuthDialog && (
          <AuthDialog
            open={showAuthDialog}
            onOpenChange={setShowAuthDialog}
            onSuccess={handleSuccessfulAuth}
          />
        )}
      </Suspense>
      {/* Policy Dialog */}
      <Suspense fallback={null}>
        {currentPolicy && (
          <PolicyDialog
            open={currentPolicy !== null}
            onOpenChange={() => setCurrentPolicy(null)}
            title={`${
              currentPolicy.charAt(0).toUpperCase() + currentPolicy.slice(1)
            } Policy`}
            content={POLICY_CONTENT[currentPolicy]}
          />
        )}
      </Suspense>
    </>
  );
}
