import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-slate-50/80 to-white/60">
      <Card className="w-full max-w-lg mx-4 rounded-3xl border-white/20 bg-white/50 backdrop-blur-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-rose-50 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-rose-400" />
            </div>
          </div>

          <h1 className="text-4xl font-light tracking-wide text-slate-800 mb-3">404</h1>

          <h2 className="text-xl font-light tracking-wide text-slate-500 mb-6">
            Page Not Found
          </h2>

          <p className="text-slate-400 mb-10 leading-relaxed tracking-wide">
            Sorry, the page you are looking for doesn't exist.
            <br />
            It may have been moved or deleted.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              onClick={handleGoHome}
              className="rounded-full px-8 py-2.5 transition-all duration-300 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12)]"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
