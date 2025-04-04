import { useState, lazy, Suspense, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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

const ProfileCompletionDialog = lazy(() =>
  import("@/components/profile-completion-dialog").then((module) => ({
    default: module.ProfileCompletionDialog,
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
// Mobile-optimized images for background slideshow
const BACKGROUND_IMAGES = [
  "/images/gerrn_image-removebg-preview.png",
  "/images/image (1).png",
  "/images/image.png",
];

// Gender selection options for mobile UI - Android style
const GENDER_OPTIONS = ["Girls", "Boys", "All"];

// Material Design colors - Android style
const ANDROID_COLORS = {
  primary: "#6200EE", // Primary color
  primaryVariant: "#3700B3", // Primary variant
  secondary: "#03DAC6", // Secondary color
  secondaryVariant: "#018786", // Secondary variant
  background: "#121212", // Background color
  surface: "#1E1E1E", // Surface color
  error: "#CF6679", // Error color
  onPrimary: "#FFFFFF", // Text on primary color
  onSecondary: "#000000", // Text on secondary color
  onBackground: "#FFFFFF", // Text on background
  onSurface: "#FFFFFF", // Text on surface
  onError: "#000000", // Text on error
};

export default function LandingPage() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState<
    keyof typeof POLICY_CONTENT | null
  >(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false); // Added state for feedback dialog
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedGender, setSelectedGender] = useState<string>("Girls");
  const [showMenuPanel, setShowMenuPanel] = useState(false); // State for three-dot menu panel

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

  const handleSuccessfulAuth = (isNewUser: boolean = false) => {
    setShowAuthDialog(false);

    if (isNewUser) {
      setShowProfileDialog(true);
    } else {
      setLocation("/chats");
    }
  };

  const handleSuccessfulProfileCompletion = () => {
    setShowProfileDialog(false);
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
  
  // Handle OAuth callback
  useEffect(() => {
    // Check for auth query parameters from Google OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    const reason = urlParams.get('reason');
    const message = urlParams.get('message');
    const profileComplete = urlParams.get('profileComplete');
    const profileData = urlParams.get('profileData');
    
    // Store profile data in sessionStorage if available
    if (profileData) {
      try {
        const decodedProfileData = JSON.parse(decodeURIComponent(profileData));
        sessionStorage.setItem('googleProfileData', JSON.stringify(decodedProfileData));
      } catch (error) {
        console.error('Error parsing profile data:', error);
      }
    }
    
    if (authStatus === 'success') {
      // Clean the URL by removing the query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: "Login Successful", 
        description: "You have successfully logged in with Google!",
      });
      
      // Check if profile needs to be completed
      if (profileComplete === 'false') {
        setShowProfileDialog(true);
      } else {
        // Redirect to chat page for verified users with completed profiles
        setLocation('/chats');
      }
    } else if (authStatus === 'failed') {
      // Clean the URL by removing the query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Handle specific error reasons
      if (reason === 'redirect_uri_mismatch') {
        toast({
          variant: "destructive",
          title: "Configuration Error",
          description: "The application's Google OAuth configuration is incorrect. Please contact support.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: message || "Google authentication failed. Please try again or use a different method.",
        });
      }
    }
  }, [toast, setLocation]);

  return (
    <>
      {isMobile ? (
        // Mobile UI with image slideshow background - redesigned based on new mockup
        <div className="min-h-screen flex flex-col bg-black">
          {/* Background slideshow */}
          <div className="fixed inset-0 bg-[#121212]">
            <div className="h-full flex flex-col">
              {/* Android-styled background - using a gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#121212] via-[#121212]/95 to-[#121212]" />
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center min-h-screen">
            {/* App bar - Android Material Design style */}
            <div className="w-full pt-6 pb-2 px-4 flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-medium text-lg">
                  AI Anime Studio
                </h2>
                <div className="flex items-center">
                  <div
                    className="w-6 h-6 flex items-center justify-center"
                    onClick={() => setShowMenuPanel(true)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="white"
                      width="22"
                      height="22"
                    >
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Background slideshow - keep the same */}
            <div className="w-full flex-1 relative overflow-hidden">
              <div className="absolute inset-2 rounded-xl overflow-hidden shadow-2xl">
                <motion.img
                  key={currentImageIndex}
                  src={BACKGROUND_IMAGES[currentImageIndex]}
                  alt="Anime Character"
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/40"></div>
              </div>
            </div>

            {/* Pagination dots - Material Design style */}
            <div className="w-full flex justify-center my-4">
              <div className="flex space-x-2">
                {BACKGROUND_IMAGES.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-2 rounded-full ${
                      index === currentImageIndex
                        ? "bg-[#6200EE]"
                        : "bg-gray-400/30"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content card - Material Design style */}
            <div className="w-full px-6 pb-8">
              <div className="bg-[#1E1E1E] rounded-xl p-6 shadow-lg">
                {/* Text content */}
                <div className="flex flex-col items-center text-center mb-6">
                  <h1 className="text-2xl font-medium text-white mb-2">
                    Welcome to{" "}
                    <span>
                      AI <span className="text-[#6200EE]">Anime</span>
                    </span>
                  </h1>
                  <p className="text-sm text-gray-300 mb-4">
                    The AI Anime studio in your phone
                  </p>
                  <div className="mt-2">
                    <span className="inline-flex items-center bg-[#6200EE]/10 text-[#BB86FC] px-3 py-1 rounded-md text-sm">
                      <span className="mr-1">⭐</span> Top AI Art Creator
                    </span>
                  </div>
                  <div className="mt-4">
                    <motion.button
                      className="cursor-pointer hover:text-white transition-colors text-[#BB86FC]"
                      onClick={() => setShowFeedbackDialog(true)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      feedback
                    </motion.button>
                  </div>
                </div>

                {/* CTA Button - Material Design style */}
                <button
                  className="w-full py-3 bg-[#6200EE] text-white font-medium text-base rounded-md shadow-md hover:bg-[#3700B3] transition-all flex items-center justify-center"
                  onClick={handleStartChatting}
                >
                  Let's get Started
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 ml-2"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Menu Panel - Material Design style */}
            {showMenuPanel && (
              <div className="fixed inset-0 bg-black/50 z-50">
                <motion.div
                  className="absolute right-0 top-0 bottom-0 w-64 bg-[#1E1E1E] shadow-lg z-50"
                  initial={{ x: 300 }}
                  animate={{ x: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {/* Menu Panel Header */}
                  <div className="flex justify-between items-center p-4 border-b border-white/10">
                    <h3 className="text-white font-medium">Menu</h3>
                    <div
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                      onClick={() => setShowMenuPanel(false)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="white"
                        width="24"
                        height="24"
                      >
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                      </svg>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <button
                      className="w-full text-left px-4 py-3 text-white hover:bg-white/5 flex items-center"
                      onClick={() => {
                        setShowFeedbackDialog(true);
                        setShowMenuPanel(false);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="white"
                        width="20"
                        height="20"
                        className="mr-3"
                      >
                        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z" />
                      </svg>
                      Feedback
                    </button>

                    <button
                      className="w-full text-left px-4 py-3 text-white hover:bg-white/5 flex items-center"
                      onClick={() => {
                        setCurrentPolicy("return");
                        setShowMenuPanel(false);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="white"
                        width="20"
                        height="20"
                        className="mr-3"
                      >
                        <path d="M19 7v4H5.83l3.58-3.59L8 6l-6 6 6 6 1.41-1.41L5.83 13H21V7z" />
                      </svg>
                      Return
                    </button>

                    <button
                      className="w-full text-left px-4 py-3 text-white hover:bg-white/5 flex items-center"
                      onClick={() => {
                        setCurrentPolicy("refund");
                        setShowMenuPanel(false);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="white"
                        width="20"
                        height="20"
                        className="mr-3"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
                      </svg>
                      Refund
                    </button>

                    <button
                      className="w-full text-left px-4 py-3 text-white hover:bg-white/5 flex items-center"
                      onClick={() => {
                        setCurrentPolicy("about");
                        setShowMenuPanel(false);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="white"
                        width="20"
                        height="20"
                        className="mr-3"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                      </svg>
                      About
                    </button>

                    <button
                      className="w-full text-left px-4 py-3 text-white hover:bg-white/5 flex items-center"
                      onClick={() => {
                        setCurrentPolicy("disclaimer");
                        setShowMenuPanel(false);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="white"
                        width="20"
                        height="20"
                        className="mr-3"
                      >
                        <path d="M11 15h2v2h-2v-2zm0-8h2v6h-2V7zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
                      </svg>
                      Disclaimer
                    </button>

                    <button
                      className="w-full text-left px-4 py-3 text-white hover:bg-white/5 flex items-center"
                      onClick={() => {
                        setCurrentPolicy("privacy");
                        setShowMenuPanel(false);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="white"
                        width="20"
                        height="20"
                        className="mr-3"
                      >
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                      </svg>
                      Privacy
                    </button>
                  </div>
                </motion.div>

                {/* Backdrop area for closing the panel */}
                <div
                  className="absolute inset-0 z-40"
                  onClick={() => setShowMenuPanel(false)}
                ></div>
              </div>
            )}
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
          {/* <div className="absolute bottom-0 left-0 p-12">
            <div className="grid grid-cols-4 gap-2">
              {[...Array(8)].map((i, _) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-white opacity-50"
                />
              ))}
            </div>
          </div> */}

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
                <motion.div
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
                </motion.div>

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
            <div className="absolute top-8 right-[30vh] flex items-center space-x-4 text-[#FF6584]">
              <div className="text-center">
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-blue-400/80">
                  <motion.button
                    className=" ursor-pointer hover:text-white transition-colors "
                    onClick={() => setShowFeedbackDialog(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    feedback
                  </motion.button>
                  {Object.keys(POLICY_CONTENT).map((policy) => (
                    <button
                      key={policy}
                      onClick={() =>
                        setCurrentPolicy(policy as keyof typeof POLICY_CONTENT)
                      }
                      className="ursor-pointer hover:text-white transition-colors"
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
              {/* <motion.button
                onClick={() => setShowFeedbackDialog(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaComment className="w-10 h-10 cursor-pointer hover:text-white transition-colors" />
                feed
              </motion.button> */}
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

      {/* Profile Completion Dialog */}
      <Suspense fallback={null}>
        {showProfileDialog && (
          <ProfileCompletionDialog
            open={showProfileDialog}
            onOpenChange={setShowProfileDialog}
            onSuccess={handleSuccessfulProfileCompletion}
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

      {/* Feedback Dialog - Global Position */}
      <Suspense fallback={null}>
        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
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
      </Suspense>
    </>
  );
}
