import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LogIn, UserPlus, ChevronRight, Search, ShieldCheck, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { SiGoogle, SiWhatsapp } from "react-icons/si";

function getRedirect() {
  const params = new URLSearchParams(window.location.search);
  return params.get("redirect") || "/";
}

function getInitialTab() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  if (mode === "signup") return "signup";
  if (mode === "whatsapp") return "whatsapp";
  return "login";
}

export default function SignIn() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const redirect = getRedirect();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "", confirm: "" });

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpName, setOtpName]     = useState("");
  const [otpSent, setOtpSent]     = useState(false);
  const [devCode, setDevCode]     = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "google_auth_failed") {
      toast.error("Google sign-in failed. Please try again.");
    }
  }, []);

  const login = trpc.auth.login.useMutation({
    onSuccess: async () => { await utils.auth.me.refetch(); toast.success("Welcome back!"); navigate(redirect); },
    onError: (e) => toast.error(e.message),
  });

  const signup = trpc.auth.signup.useMutation({
    onSuccess: async () => { await utils.auth.me.refetch(); toast.success("Account created! Welcome to VOOM."); navigate(redirect); },
    onError: (e) => toast.error(e.message),
  });

  const requestOtp = trpc.auth.requestOtp.useMutation({
    onSuccess: (data) => {
      setOtpSent(true);
      toast.success(`Code sent to ${phone} via WhatsApp`);
      if (data.dev && data.devCode) {
        setDevCode(data.devCode);
        toast.info(`Dev mode — your code is: ${data.devCode}`, { duration: 30000 });
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const verifyOtp = trpc.auth.verifyOtp.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.refetch();
      if (data.isNewUser) toast.success("Welcome to VOOM! Account created.");
      else toast.success("Welcome back!");
      navigate(redirect);
    },
    onError: (e) => toast.error(e.message),
  });

  const googleHref = `/api/auth/google?redirect=${encodeURIComponent(redirect)}`;

  return (
    <div className="signin-page">

      {/* ── Hero ── */}
      <div className="signin-hero px-6 pt-16 pb-20 text-center relative overflow-hidden">
        <div className={`transition-all duration-700 delay-100 max-w-md mx-auto ${mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
          <p className="text-xs font-medium tracking-[0.22em] uppercase text-white/50 mb-4">
            Ghana's Digital Car Parts Marketplace
          </p>
          <h1 className="text-3xl sm:text-4xl font-light tracking-wide text-white mb-3 leading-tight">
            The part you need,<br />wherever you are in Ghana
          </h1>
          <p className="text-white/55 text-sm leading-relaxed max-w-xs mx-auto">
            Search verified dealers from Abossey Okai to Kumasi. Free to browse, instant WhatsApp contact.
          </p>
        </div>

        <div className={`flex flex-wrap justify-center gap-2 mt-7 transition-all duration-700 delay-200 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          {[
            { icon: <Search className="h-3 w-3" />, label: "Free to browse" },
            { icon: <ShieldCheck className="h-3 w-3" />, label: "Verified dealers" },
            { icon: <MessageCircle className="h-3 w-3" />, label: "WhatsApp contact" },
          ].map(({ icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-xs text-white/70 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-3 py-1">
              {icon} {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Auth Form ── */}
      <div className="signin-auth-wrap max-w-md mx-auto">
        <div className={`signin-auth-inner px-5 sm:px-8 py-10 transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>

          {/* Google */}
          <a href={googleHref} className="block mb-5" data-testid="button-google-signin">
            <Button
              variant="outline"
              className="w-full h-12 rounded-full gap-3 bg-white/10 border-white/20 text-white hover:bg-white/18 hover:border-white/30 text-sm font-medium tracking-wide backdrop-blur-sm transition-all"
              type="button"
            >
              <SiGoogle className="h-4 w-4 text-[#4285F4]" />
              Continue with Google
            </Button>
          </a>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px bg-white/15" />
            <span className="text-xs text-white/40 tracking-widest uppercase">or</span>
            <div className="flex-1 h-px bg-white/15" />
          </div>

          <Tabs defaultValue={getInitialTab()} className="w-full">
            <TabsList className="w-full rounded-2xl bg-white/10 border border-white/12 p-1 mb-6 backdrop-blur-sm">
              <TabsTrigger value="login" className="flex-1 rounded-xl gap-2 text-white/55 data-[state=active]:bg-white/18 data-[state=active]:text-white data-[state=active]:shadow-sm text-xs sm:text-sm transition-all">
                <LogIn className="h-3.5 w-3.5" /> Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1 rounded-xl gap-2 text-white/55 data-[state=active]:bg-white/18 data-[state=active]:text-white data-[state=active]:shadow-sm text-xs sm:text-sm transition-all">
                <UserPlus className="h-3.5 w-3.5" /> Register
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex-1 rounded-xl gap-2 text-white/55 data-[state=active]:bg-white/18 data-[state=active]:text-white data-[state=active]:shadow-sm text-xs sm:text-sm transition-all">
                <SiWhatsapp className="h-3.5 w-3.5 text-[#25D366]" /> WhatsApp
              </TabsTrigger>
            </TabsList>

            {/* ── Email Sign In ── */}
            <TabsContent value="login">
              <div className="rounded-3xl bg-white/8 border border-white/15 backdrop-blur-sm p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-light tracking-wide text-white">Welcome back</h2>
                  <p className="text-sm text-white/50 tracking-wide mt-0.5">Sign in to your VOOM account</p>
                </div>
                <div>
                  <Label className="tracking-wide text-sm text-white/70">Email</Label>
                  <Input
                    type="email"
                    data-testid="input-login-email"
                    className="rounded-2xl mt-1.5"
                    placeholder="your@email.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && login.mutate(loginForm)}
                  />
                </div>
                <div>
                  <Label className="tracking-wide text-sm text-white/70">Password</Label>
                  <Input
                    type="password"
                    data-testid="input-login-password"
                    className="rounded-2xl mt-1.5"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && login.mutate(loginForm)}
                  />
                </div>
                <Button
                  data-testid="button-login"
                  className="w-full h-11 rounded-full text-white mt-2"
                  disabled={login.isPending || !loginForm.email || !loginForm.password}
                  onClick={() => login.mutate(loginForm)}
                >
                  {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                </Button>
              </div>
            </TabsContent>

            {/* ── Create Account ── */}
            <TabsContent value="signup">
              <div className="rounded-3xl bg-white/8 border border-white/15 backdrop-blur-sm p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-light tracking-wide text-white">Create account</h2>
                  <p className="text-sm text-white/50 tracking-wide mt-0.5">Find parts faster. Save favourites. Track orders.</p>
                </div>
                <div>
                  <Label className="tracking-wide text-sm text-white/70">Full Name</Label>
                  <Input
                    data-testid="input-signup-name"
                    className="rounded-2xl mt-1.5"
                    placeholder="Kwame Mensah"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="tracking-wide text-sm text-white/70">Email</Label>
                  <Input
                    type="email"
                    data-testid="input-signup-email"
                    className="rounded-2xl mt-1.5"
                    placeholder="your@email.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="tracking-wide text-sm text-white/70">Password</Label>
                  <Input
                    type="password"
                    data-testid="input-signup-password"
                    className="rounded-2xl mt-1.5"
                    placeholder="At least 8 characters"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="tracking-wide text-sm text-white/70">Confirm Password</Label>
                  <Input
                    type="password"
                    data-testid="input-signup-confirm"
                    className="rounded-2xl mt-1.5"
                    placeholder="••••••••"
                    value={signupForm.confirm}
                    onChange={(e) => setSignupForm({ ...signupForm, confirm: e.target.value })}
                  />
                </div>
                <Button
                  data-testid="button-signup"
                  className="w-full h-11 rounded-full text-white mt-2"
                  disabled={signup.isPending || !signupForm.name || !signupForm.email || !signupForm.password}
                  onClick={() => {
                    if (signupForm.password !== signupForm.confirm) { toast.error("Passwords do not match"); return; }
                    if (signupForm.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
                    signup.mutate({ name: signupForm.name, email: signupForm.email, password: signupForm.password });
                  }}
                >
                  {signup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                </Button>
              </div>
            </TabsContent>

            {/* ── WhatsApp OTP ── */}
            <TabsContent value="whatsapp">
              <div className="rounded-3xl bg-white/8 border border-white/15 backdrop-blur-sm p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-light tracking-wide text-white flex items-center gap-2">
                    <SiWhatsapp className="h-5 w-5 text-[#25D366]" /> WhatsApp Sign In
                  </h2>
                  <p className="text-sm text-white/50 tracking-wide mt-0.5">
                    {otpSent ? `Enter the 6-digit code sent to ${phone}` : "No password needed — sign in with your Ghana number"}
                  </p>
                </div>
                {!otpSent ? (
                  <>
                    <div>
                      <Label className="tracking-wide text-sm text-white/70">WhatsApp Number</Label>
                      <div className="flex gap-2 mt-1.5">
                        <Input className="rounded-2xl w-20 text-center shrink-0 font-mono" value="+233" readOnly title="Ghana country code" />
                        <Input
                          type="tel"
                          data-testid="input-whatsapp-phone"
                          className="rounded-2xl flex-1"
                          placeholder="24 000 0000"
                          value={phone.replace(/^\+233/, "")}
                          onChange={(e) => setPhone("+233" + e.target.value.replace(/\D/g, ""))}
                          onKeyDown={(e) => e.key === "Enter" && phone.length >= 10 && requestOtp.mutate({ phone })}
                        />
                      </div>
                      <p className="text-xs text-white/35 mt-1.5 tracking-wide">Ghana number (e.g. 024 000 0000)</p>
                    </div>
                    <Button
                      data-testid="button-send-otp"
                      className="w-full h-11 rounded-full bg-[#25D366] hover:bg-[#1eb855] text-white gap-2"
                      disabled={requestOtp.isPending || phone.length < 10}
                      onClick={() => requestOtp.mutate({ phone })}
                    >
                      {requestOtp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><SiWhatsapp className="h-4 w-4" /> Send Code via WhatsApp</>}
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="tracking-wide text-sm text-white/70">6-Digit Code</Label>
                      <Input
                        type="text" inputMode="numeric" maxLength={6}
                        data-testid="input-otp-code"
                        className="rounded-2xl mt-1.5 text-center text-2xl tracking-[0.4em] font-mono h-14"
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        onKeyDown={(e) => e.key === "Enter" && otp.length === 6 && verifyOtp.mutate({ phone, code: otp, name: otpName || undefined })}
                      />
                    </div>
                    <div>
                      <Label className="tracking-wide text-sm text-white/50">Your Name <span className="text-white/30">(optional, for new accounts)</span></Label>
                      <Input data-testid="input-otp-name" className="rounded-2xl mt-1.5" placeholder="Kwame Mensah" value={otpName} onChange={(e) => setOtpName(e.target.value)} />
                    </div>
                    {devCode && (
                      <div className="rounded-2xl bg-amber-500/20 border border-amber-400/30 px-4 py-3 text-sm text-amber-200">
                        <strong>Dev mode:</strong> your code is <code className="font-mono font-bold text-base tracking-widest">{devCode}</code>
                      </div>
                    )}
                    <Button
                      data-testid="button-verify-otp"
                      className="w-full h-11 rounded-full text-white gap-2"
                      disabled={verifyOtp.isPending || otp.length < 6}
                      onClick={() => verifyOtp.mutate({ phone, code: otp, name: otpName || undefined })}
                    >
                      {verifyOtp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ChevronRight className="h-4 w-4" /> Verify & Sign In</>}
                    </Button>
                    <button
                      type="button"
                      className="text-xs text-white/35 underline underline-offset-2 w-full text-center"
                      onClick={() => { setOtpSent(false); setOtp(""); setDevCode(null); }}
                    >
                      Use a different number
                    </button>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-white/30 mt-6 tracking-wide leading-relaxed pb-10">
            By signing in you agree to VOOM's terms of use.<br />
            Need help? WhatsApp us at{" "}
            <a href="https://wa.me/19172541550" className="text-white/50 underline underline-offset-2">
              +1-917-254-1550
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
