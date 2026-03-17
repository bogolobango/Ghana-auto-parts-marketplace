import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { GHANA_REGIONS, GHANA_CITIES } from "@shared/marketplace";
import {
  Loader2, CheckCircle2, ArrowRight, ShieldCheck, Zap, Users,
  Store, TrendingUp, MessageCircle, Clock, ChevronDown, ChevronUp,
  MapPin, Package, Star, Banknote,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const BENEFITS = [
  {
    icon: Banknote,
    title: "0% Commission While You Grow",
    desc: "List for free. VOOM only earns when you do — and we'll always be transparent about our rates.",
  },
  {
    icon: Store,
    title: "Your Own Branded Shop Page",
    desc: "Get a public storefront with your logo, location, and all your listings in one place.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Buyer Messaging",
    desc: "Buyers can reach you directly on WhatsApp. No middleman, no missed leads.",
  },
  {
    icon: Clock,
    title: "List in Under 10 Minutes",
    desc: "Simple listing flow with photos, compatibility details, and pricing. No technical knowledge needed.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Apply in 2 minutes",
    desc: "Fill in your business name, phone, and location. Our team reviews and approves within 24 hours.",
  },
  {
    step: "02",
    title: "List your parts",
    desc: "Upload photos, set your price, and tag compatibility — Toyota, Honda, Mercedes, any make.",
  },
  {
    step: "03",
    title: "Buyers come to you",
    desc: "Shoppers across Ghana search VOOM and find your parts. They message you on WhatsApp or add to cart.",
  },
];

const FEATURES = [
  "Shop page visible to buyers across all 16 regions",
  "Inventory management dashboard",
  "Order tracking and buyer notifications",
  "WhatsApp-first buyer communication",
  "Vehicle compatibility tagging (make, model, year)",
  "New, used, and refurbished part listings",
  "Featured listing boosts available",
  "Seller analytics and performance stats",
];

const FAQS = [
  {
    q: "Do I need a registered business to sell on VOOM?",
    a: "No. Individual traders, roadside shops, and established dealerships are all welcome. You just need a Ghana Card and a phone number.",
  },
  {
    q: "Can I list used and Tokunbo parts?",
    a: "Absolutely. VOOM supports new, used, and refurbished parts. Just label them correctly and buyers know what to expect.",
  },
  {
    q: "How do buyers pay?",
    a: "Buyers contact you directly via WhatsApp to arrange payment. Secure MoMo checkout coming soon.",
  },
  {
    q: "What is VOOM's commission?",
    a: "We're currently 0% commission while the platform grows. We'll give all vendors advance notice before any rate changes.",
  },
  {
    q: "How long does approval take?",
    a: "Our team reviews every application within 24 hours. Most are approved the same day.",
  },
  {
    q: "Can I list parts for multiple vehicle makes?",
    a: "Yes. One account lets you list parts for any make and model — Toyota, Honda, Mercedes, Hyundai, whatever you stock.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/20 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-4 flex items-start justify-between gap-4 group"
      >
        <span className="text-sm font-medium tracking-wide text-foreground/90 group-hover:text-primary transition-colors">
          {q}
        </span>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        }
      </button>
      {open && (
        <p className="text-sm text-muted-foreground leading-relaxed pb-4 tracking-wide">{a}</p>
      )}
    </div>
  );
}

function PitchPage({ showForm }: { showForm?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const stats = trpc.publicStats.useQuery();
  const productCount = stats.data?.totalProducts ?? 240;
  const categoryCount = stats.data?.totalCategories ?? 12;

  return (
    <div className={`transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>

      {/* ── Hero ── */}
      <div className="vendor-hero px-6 pt-16 pb-20 text-center relative overflow-hidden">
        <div className={`transition-all duration-700 delay-100 max-w-lg mx-auto ${mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
          <span className="inline-flex items-center gap-1.5 text-xs text-white/60 bg-white/10 border border-white/15 rounded-full px-3 py-1 mb-5 tracking-wide">
            <Star className="h-3 w-3 fill-voom-gold text-voom-gold" /> Ghana's Fastest-Growing Parts Platform
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-wide text-white mb-4 leading-tight">
            Turn Your Parts Stock<br />Into Daily Income
          </h1>
          <p className="text-white/60 text-sm sm:text-base leading-relaxed max-w-sm mx-auto">
            Join verified vendors already reaching thousands of buyers across all 16 regions of Ghana — from a single dashboard.
          </p>
        </div>

        {/* Live stats row */}
        <div className={`flex flex-wrap justify-center gap-6 mt-10 transition-all duration-700 delay-200 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          {[
            { value: `${productCount}+`, label: "Parts Listed" },
            { value: `${categoryCount}`, label: "Categories" },
            { value: "16", label: "Regions Covered" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-light text-white tracking-wide">{value}</p>
              <p className="text-xs text-white/45 tracking-widest uppercase mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Trust chips */}
        <div className={`flex flex-wrap justify-center gap-2 mt-8 transition-all duration-700 delay-300 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          {[
            { icon: <Zap className="h-3 w-3" />, label: "Free to join" },
            { icon: <ShieldCheck className="h-3 w-3" />, label: "Approved in 24 hrs" },
            { icon: <Users className="h-3 w-3" />, label: "0% Commission" },
            { icon: <MapPin className="h-3 w-3" />, label: "All 16 regions" },
          ].map(({ icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-xs text-white/70 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-3 py-1">
              {icon} {label}
            </span>
          ))}
        </div>

        {!showForm && (
          <div className={`mt-10 transition-all duration-700 delay-400 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            <Link href="/sign-in?redirect=/vendor/register">
              <Button size="lg" className="rounded-full px-8 bg-white text-foreground hover:bg-white/90 font-medium gap-2 shadow-lg no-underline">
                Start Selling Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <p className="text-xs text-white/40 mt-3 tracking-wide">Takes less than 2 minutes · No credit card required</p>
          </div>
        )}
      </div>

      {/* ── Benefits grid ── */}
      <div className="bg-background px-5 sm:px-8 py-14 max-w-4xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-light tracking-wide text-center mb-2">
          Everything you need to sell online
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-10 tracking-wide">
          VOOM handles the platform. You handle the parts.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border/20 bg-white/60 backdrop-blur-md p-5 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium text-sm tracking-wide mb-1.5">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed tracking-wide">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="bg-muted/20 px-5 sm:px-8 py-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-light tracking-wide text-center mb-2">How it works</h2>
          <p className="text-sm text-muted-foreground text-center mb-10 tracking-wide">
            From application to first sale in under 48 hours.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
            {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
              <div key={step} className="relative flex flex-col items-center text-center sm:items-start sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 flex-shrink-0">
                  <span className="text-sm font-light text-primary tracking-widest">{step}</span>
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden sm:block absolute top-6 left-[calc(100%-1rem)] w-8 border-t border-dashed border-border/40" />
                )}
                <h3 className="font-medium text-sm tracking-wide mb-1.5">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed tracking-wide">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Earnings callout ── */}
      <div className="px-5 sm:px-8 py-12 max-w-4xl mx-auto">
        <div className="rounded-2xl bg-gradient-to-br from-primary/8 to-primary/4 border border-primary/15 p-7 sm:p-10 text-center">
          <TrendingUp className="h-8 w-8 text-primary mx-auto mb-4 opacity-70" />
          <h2 className="text-xl sm:text-2xl font-light tracking-wide mb-2">
            Top vendors earn GH¢ 5,000+ monthly
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed tracking-wide">
            Parts for popular makes like Toyota, Honda, and Hyundai move fast. Vendors who keep their inventory updated consistently outsell offline-only shops.
          </p>
        </div>
      </div>

      {/* ── What you get ── */}
      <div className="bg-muted/20 px-5 sm:px-8 py-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-light tracking-wide text-center mb-2">What's included</h2>
          <p className="text-sm text-muted-foreground text-center mb-10 tracking-wide">
            No upsells. Everything below comes with your free vendor account.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground/80 tracking-wide">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="px-5 sm:px-8 py-14 max-w-3xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-light tracking-wide text-center mb-2">Common questions</h2>
        <p className="text-sm text-muted-foreground text-center mb-10 tracking-wide">
          Everything you need to know before you apply.
        </p>
        <div className="rounded-2xl border border-border/20 bg-white/60 backdrop-blur-md px-6 divide-y divide-border/20">
          {FAQS.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>

      {/* ── Bottom CTA (guest only) ── */}
      {!showForm && (
        <div className="px-5 sm:px-8 pb-20 text-center">
          <h2 className="text-xl sm:text-2xl font-light tracking-wide mb-3">Ready to grow your business?</h2>
          <p className="text-sm text-muted-foreground mb-7 tracking-wide">
            Free to join. Approved in 24 hours. Your first listing is free.
          </p>
          <Link href="/sign-in?redirect=/vendor/register">
            <Button size="lg" className="rounded-full px-10 gap-2 text-white shadow-md">
              Start Selling Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground/50 mt-3 tracking-wide">
            Takes less than 2 minutes · No credit card required
          </p>
        </div>
      )}
    </div>
  );
}

function ApplicationForm() {
  const [, navigate] = useLocation();
  const registerVendor = trpc.vendor.register.useMutation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const [form, setForm] = useState({
    businessName: "",
    description: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    city: "",
    region: "",
    ghanaCardNumber: "",
  });

  const handleSubmit = async () => {
    if (!form.businessName || !form.phone) {
      toast.error("Business name and phone number are required");
      return;
    }
    try {
      await registerVendor.mutateAsync(form);
      toast.success("Application submitted! You'll be notified once approved.");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to register");
    }
  };

  return (
    <div className="relative -mt-6 z-10">
      <div
        className={`bg-background rounded-t-3xl px-5 sm:px-8 pt-8 pb-12 max-w-2xl mx-auto transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">Step 1 of 1</p>
            <p className="text-sm font-medium tracking-wide">Your Application</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/50 mb-5 tracking-wide leading-relaxed bg-muted/30 rounded-xl px-4 py-3">
          Approved in 24 hours. All fields marked <span className="text-primary">*</span> are required. The rest you can complete from your dashboard after approval.
        </p>

        {/* Business */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">Business Details</p>
        <div className="space-y-4 mb-8">
          <div className="vendor-field">
            <Label className="tracking-wide text-sm font-medium">Business Name <span className="text-primary">*</span></Label>
            <Input
              className="vendor-input mt-1.5"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              placeholder="e.g. Kwame Auto Parts"
              data-testid="input-business-name"
            />
          </div>
          <div className="vendor-field">
            <Label className="tracking-wide text-sm font-medium">What do you specialise in? <span className="text-muted-foreground/40 font-normal text-xs">(optional)</span></Label>
            <Textarea
              className="vendor-input mt-1.5 resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Toyota & Honda genuine and Tokunbo parts, 10 years experience, Abossey Okai…"
              rows={3}
              data-testid="input-description"
            />
          </div>
        </div>

        {/* Contact */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">Contact Info</p>
        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="vendor-field">
              <Label className="tracking-wide text-sm font-medium">Phone Number <span className="text-primary">*</span></Label>
              <Input
                className={`vendor-input mt-1.5 ${form.phone && form.phone.length > 3 && !/^0[2-9]\d\d{3}\d{4}$/.test(form.phone.replace(/[\s-]/g, "")) ? "border-destructive/50 focus-visible:ring-destructive/30" : ""}`}
                value={form.phone}
                type="tel"
                inputMode="numeric"
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9\s-]/g, "") })}
                placeholder="0241234567"
                data-testid="input-phone"
              />
              {form.phone && form.phone.length > 3 && !/^0[2-9]\d\d{3}\d{4}$/.test(form.phone.replace(/[\s-]/g, "")) && (
                <p className="text-xs text-destructive/70 mt-1.5 tracking-wide">Enter a valid Ghana phone (e.g. 024 123 4567)</p>
              )}
            </div>
            <div className="vendor-field">
              <Label className="tracking-wide text-sm font-medium">
                WhatsApp Number <span className="text-muted-foreground/40 font-normal text-xs">(buyers will message you here)</span>
              </Label>
              <Input
                className="vendor-input mt-1.5"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="0241234567"
                data-testid="input-whatsapp"
              />
            </div>
          </div>
          <div className="vendor-field">
            <Label className="tracking-wide text-sm font-medium">Email <span className="text-muted-foreground/40 font-normal text-xs">(optional)</span></Label>
            <Input
              className="vendor-input mt-1.5"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="business@email.com"
              type="email"
              data-testid="input-email"
            />
          </div>
          <div className="vendor-field">
            <Label className="tracking-wide text-sm font-medium">Ghana Card Number <span className="text-muted-foreground/40 font-normal text-xs">(for identity verification)</span></Label>
            <Input
              className={`vendor-input mt-1.5 ${form.ghanaCardNumber && !/^GHA-\d{9}-\d$/.test(form.ghanaCardNumber) ? "border-destructive/50 focus-visible:ring-destructive/30" : ""}`}
              value={form.ghanaCardNumber}
              onChange={(e) => setForm({ ...form, ghanaCardNumber: e.target.value.toUpperCase() })}
              placeholder="GHA-123456789-0"
              data-testid="input-ghana-card"
            />
            {form.ghanaCardNumber && !/^GHA-\d{9}-\d$/.test(form.ghanaCardNumber) && (
              <p className="text-xs text-destructive/70 mt-1.5 tracking-wide">Expected format: GHA-XXXXXXXXX-X</p>
            )}
          </div>
        </div>

        {/* Location */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">Location</p>
        <div className="space-y-4 mb-10">
          <div className="vendor-field">
            <Label className="tracking-wide text-sm font-medium">Shop / Street Address <span className="text-muted-foreground/40 font-normal text-xs">(optional)</span></Label>
            <Input
              className="vendor-input mt-1.5"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Shop number, street, area"
              data-testid="input-address"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="vendor-field">
              <Label className="tracking-wide text-sm font-medium">City</Label>
              <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v })}>
                <SelectTrigger className="vendor-input mt-1.5" data-testid="select-city"><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>
                  {GHANA_CITIES.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="vendor-field">
              <Label className="tracking-wide text-sm font-medium">Region</Label>
              <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                <SelectTrigger className="vendor-input mt-1.5" data-testid="select-region"><SelectValue placeholder="Select region" /></SelectTrigger>
                <SelectContent>
                  {GHANA_REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button
          className="vendor-cta w-full h-13 text-base font-medium rounded-2xl gap-2"
          size="lg"
          disabled={registerVendor.isPending}
          onClick={handleSubmit}
          data-testid="button-submit-vendor"
        >
          {registerVendor.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
          ) : (
            <>Start Selling on VOOM <ArrowRight className="h-4 w-4" /></>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground/50 mt-4 tracking-wide leading-relaxed">
          By applying you agree to VOOM's vendor terms. Your application is reviewed within 24 hours.
        </p>
      </div>
    </div>
  );
}

export default function VendorRegister() {
  const { isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const existingVendor = trpc.vendor.me.useQuery(undefined, { enabled: isAuthenticated });
  const [, navigate] = useLocation();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/90" />
      </div>
    );
  }

  // ── Already a vendor ──
  if (isAuthenticated && existingVendor.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-light tracking-wide mb-2">You're already a VOOM vendor</h2>
          <p className="text-muted-foreground/70 mb-1 tracking-wide">
            Status: <span className="font-medium capitalize text-foreground">{existingVendor.data.status}</span>
          </p>
          {existingVendor.data.status === "pending" && (
            <p className="text-sm text-muted-foreground/60 mt-3 max-w-xs mx-auto leading-relaxed">
              Your application is under review. We typically approve within 24 hours — we'll notify you.
            </p>
          )}
          {existingVendor.data.status === "approved" && (
            <Button onClick={() => navigate("/vendor/dashboard")} className="mt-7 rounded-full px-8 gap-2 text-white">
              Go to Your Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Guest: full pitch page, CTA goes to sign-in ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <PitchPage showForm={false} />
      </div>
    );
  }

  // ── Authenticated, not yet a vendor: pitch header + form ──
  return (
    <div className="min-h-screen bg-background">
      {/* Condensed pitch hero for signed-in users */}
      <div className="vendor-hero px-6 pt-14 pb-20 text-center relative overflow-hidden">
        <div className={`transition-all duration-700 delay-100 max-w-md mx-auto ${mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
          <h1 className="text-3xl sm:text-4xl font-light tracking-wide text-white mb-3 leading-tight">
            Partner With Us
          </h1>
          <p className="text-white/55 text-sm leading-relaxed max-w-xs mx-auto">
            You're one application away from reaching buyers across all 16 regions of Ghana.
          </p>
        </div>
        <div className={`flex flex-wrap justify-center gap-2 mt-7 transition-all duration-700 delay-200 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          {[
            { icon: <Zap className="h-3 w-3" />, label: "Free to join" },
            { icon: <ShieldCheck className="h-3 w-3" />, label: "Approved in 24 hrs" },
            { icon: <Users className="h-3 w-3" />, label: "0% Commission" },
          ].map(({ icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-xs text-white/70 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-3 py-1">
              {icon} {label}
            </span>
          ))}
        </div>
      </div>

      <ApplicationForm />
    </div>
  );
}
