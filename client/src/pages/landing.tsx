import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function LandingPage() {
  return (
    <div className="min-h-screen relative">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/90 to-indigo-900/90" />

      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDYwIEwgNjAgMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 min-h-screen flex flex-col justify-center items-center text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          AI Anime Character Chat
        </h1>

        <p className="text-xl text-gray-200 mb-8 max-w-2xl">
          Experience immersive conversations with your favorite anime characters in multiple languages. Our AI-powered chat system brings characters to life with natural, context-aware responses.
        </p>

        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 max-w-xl w-full">
          <div className="space-y-4 text-left bg-white/10 p-6 rounded-lg backdrop-blur">
            <h3 className="text-xl font-semibold text-white">Key Features</h3>
            <ul className="space-y-2 text-gray-200">
              <li>• Multiple language support</li>
              <li>• Character-authentic responses</li>
              <li>• Natural conversations</li>
              <li>• Custom character creation</li>
            </ul>
          </div>

          <div className="space-y-4 text-left bg-white/10 p-6 rounded-lg backdrop-blur">
            <h3 className="text-xl font-semibold text-white">Supported Languages</h3>
            <ul className="space-y-2 text-gray-200">
              <li>• English</li>
              <li>• Japanese</li>
              <li>• Chinese</li>
              <li>• Korean & more</li>
            </ul>
          </div>
        </div>

        <Link href="/chats">
          <Button size="lg" className="mt-12 text-lg px-8 py-6 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white border-none">
            Start Chatting Now
          </Button>
        </Link>
      </div>
    </div>
  );
}