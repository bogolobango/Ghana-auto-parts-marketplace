import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import ProductCard from "@/components/ProductCard";
import CategoryOrb from "@/components/CategoryOrb";
import {
  Search, ArrowRight, ShieldCheck, MessageCircle,
  Store, AlertTriangle, ChevronRight, Lock,
  MapPin, Smartphone, Zap, TrendingUp, Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { VEHICLE_MAKES } from "@shared/marketplace";

const FEATURED_CATEGORY_ID = 2;  // Brakes, Suspension & Steering
const ENGINE_CATEGORY_ID   = 1;  // Engine & Drivetrain
const VISIBLE_COLS         = 4;
const VISIBLE_ROWS         = 2;
const VISIBLE_COUNT        = VISIBLE_ROWS * VISIBLE_COLS;

const POPULAR_MAKES = [
  "Toyota", "Honda", "Mercedes-Benz", "Hyundai",
  "Nissan", "Kia", "Mitsubishi", "Ford", "Volkswagen",
];

const BRAND_LOGOS = [
  { name: "Gates",   src: "/brands/gates-clean.png" },
  { name: "Bosch",   src: "/brands/bosch-clean.png" },
  { name: "NGK",     src: "/brands/ngk-clean.png" },
  { name: "Denso",   src: "/brands/denso-clean.png" },
  { name: "Monroe",  src: "/brands/monroe-clean.png" },
  { name: "Valeo",   src: "/brands/valeo-clean.png" },
  { name: "Brembo",  src: "/brands/brembo-clean.png" },
  { name: "ACDelco", src: "/brands/acdelco-clean.png" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Search,
    title: "Search your part",
    desc: "Type your car make, part name, or OEM part number. Filter by year, condition, and region.",
  },
  {
    step: "02",
    icon: MessageCircle,
    title: "Contact the vendor",
    desc: "Find your part and chat directly with the vendor on WhatsApp — no middleman, no waiting.",
  },
  {
    step: "03",
    icon: MapPin,
    title: "Pick up or arrange delivery",
    desc: "Collect from the vendor's shop and inspect before you buy. No online payment needed — pay cash on pickup.",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate]        = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [waitlistPhone, setWaitlistPhone] = useState("");
  const [waitlistDone, setWaitlistDone] = useState(false);
  const joinWaitlist = trpc.waitlist.join.useMutation({
    onSuccess: () => { setWaitlistDone(true); toast.success("You're on the list! We'll WhatsApp you when MoMo goes live."); },
    onError: () => toast.error("Could not join — please try again."),
  });

  useEffect(() => {
    document.title = "VOOM Ghana — Find Car Parts Near You";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", "Ghana's digital spare parts marketplace. Find genuine and Tokunbo auto parts from verified dealers across all 16 regions. Search by make, model, and year. Contact vendors on WhatsApp instantly.");
  }, []);

  const stats       = trpc.publicStats.useQuery();
  const categories  = trpc.category.list.useQuery();
  const featured    = trpc.product.byCategory.useQuery({
    categoryId: FEATURED_CATEGORY_ID,
    limit: VISIBLE_COUNT + VISIBLE_COLS,
  });
  const engine      = trpc.product.byCategory.useQuery({
    categoryId: ENGINE_CATEGORY_ID,
    limit: VISIBLE_COUNT,
  });

  const allFeatured    = featured.data ?? [];
  const visibleFeatured = allFeatured.slice(0, VISIBLE_COUNT);
  const gatedFeatured  = allFeatured.slice(VISIBLE_COUNT);
  const engineParts    = engine.data ?? [];

  function handleSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    // If the query exactly matches a known vehicle make, use the make filter directly
    const matchedMake = VEHICLE_MAKES.find(m => m.toLowerCase() === q.toLowerCase());
    if (matchedMake) {
      navigate(`/products?make=${encodeURIComponent(matchedMake)}`);
    } else {
      navigate(`/products?search=${encodeURIComponent(q)}`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Hero ── */}
      <section className="zen-hero" style={{
        backgroundImage: "url('/hero-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}>
        <div className="container relative py-8 md:py-12 lg:py-14">
          <div className="max-w-2xl space-y-4 md:space-y-5">

            <div className="inline-flex items-center gap-2.5 glass-dark rounded-full px-4 py-1.5 text-xs sm:text-sm text-white/80 tracking-wide">
              <Store className="h-3.5 w-3.5 text-primary/80" />
              Ghana's Digital Car Parts Marketplace
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-white leading-[1.1] tracking-[0.02em]">
              Find parts for your<br />
              <span className="text-primary font-normal">Toyota, Honda</span>
              <span className="text-white/70 font-light"> or any car</span>
            </h1>

            <p className="text-base sm:text-lg text-white/55 max-w-lg leading-relaxed tracking-wide font-light">
              Genuine and Tokunbo parts from verified dealers across all 16 regions of Ghana — searchable by make, model, and year.
            </p>

            {/* Search */}
            <div className="flex gap-2 sm:gap-3 max-w-lg">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input
                  placeholder="Search by part, brand, or model…"
                  className="pl-11 h-12 sm:h-13 py-0 bg-white/90 text-foreground border-white/30 rounded-[100px] shadow-[0_8px_32px_-6px_rgba(0,0,0,0.12)] backdrop-blur-xl text-sm leading-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                  data-testid="input-search"
                />
              </div>
              <Button
                size="lg"
                className="h-12 sm:h-13 px-5 sm:px-7 bg-primary/90 hover:bg-primary text-white rounded-[100px] shadow-[0_8px_32px_-6px_rgba(0,0,0,0.15)] shrink-0 text-sm sm:text-base"
                onClick={handleSearch}
                data-testid="button-search"
              >
                Search
              </Button>
            </div>

            {/* Vehicle make quick filters */}
            <div className="flex flex-wrap gap-2 pt-1" data-testid="section-make-filters">
              <span className="text-xs text-white/70 tracking-wide self-center">Popular:</span>
              {POPULAR_MAKES.map((make) => (
                <Link
                  key={make}
                  href={`/products?make=${encodeURIComponent(make)}`}
                  className="no-underline"
                  data-testid={`chip-make-${make}`}
                >
                  <span className="inline-block text-xs text-white bg-white/45 hover:bg-white/60 border border-white/60 rounded-full px-3 py-1 cursor-pointer transition-colors tracking-wide">
                    {make}
                  </span>
                </Link>
              ))}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 sm:gap-6 pt-4">
              {[
                { val: stats.data ? `${stats.data.totalProducts}+` : "…", label: "Parts Listed" },
                { val: stats.data ? `${stats.data.totalCategories}` : "…", label: "Categories" },
                { val: "16", label: "Regions" },
              ].map(({ val, label }) => (
                <div key={label} className="glass-dark rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3">
                  <p className="text-xl sm:text-2xl font-light text-white tracking-wide">{val}</p>
                  <p className="text-[10px] sm:text-[11px] text-white/40 tracking-wider uppercase mt-0.5">{label}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Trust / payment strip ── */}
      <div className="bg-foreground/[0.03] border-b border-border/20 py-3 overflow-hidden">
        <div className="container flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[
            { icon: Smartphone,  label: "MoMo payments launching soon" },
            { icon: ShieldCheck, label: "Ghana Card–verified vendors" },
            { icon: Zap,         label: "Same-day WhatsApp response" },
            { icon: MapPin,      label: "Pickup available nationwide" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground/70 tracking-wide whitespace-nowrap">
              <Icon className="h-3.5 w-3.5 text-primary/60 flex-shrink-0" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Popular Brands marquee (before categories) ── */}
      <div className="bg-muted/30 border-y border-border/20 py-8 overflow-hidden brand-marquee-wrap" data-testid="section-brands-top">
        <p className="text-xs text-muted-foreground/50 tracking-widest uppercase text-center mb-6">
          Popular brands stocked by our vendors
        </p>
        <div className="relative overflow-hidden">
          <div className="flex items-center gap-14 brand-marquee w-max px-7">
            {[...BRAND_LOGOS, ...BRAND_LOGOS].map((brand, i) => (
              <Link
                key={i}
                href={`/products?search=${encodeURIComponent(brand.name)}`}
                className="no-underline shrink-0 flex items-center"
                data-testid={`logo-brand-top-${brand.name}-${i}`}
              >
                <img
                  src={brand.src}
                  alt={brand.name}
                  className="h-9 w-auto object-contain opacity-40 grayscale hover:opacity-90 hover:grayscale-0 transition-all duration-300"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Categories + Products shared bg ── */}
      <div className="relative overflow-hidden" style={{
        backgroundImage: "url('/categories-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}>
        <div className="absolute inset-0 backdrop-blur-2xl" style={{ background: "rgba(255,255,255,0.82)" }} />

        {/* Category orbs */}
        <section className="zen-section relative">
          <div className="container">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-light text-foreground tracking-wide">Shop by Category</h2>
                <p className="text-sm text-muted-foreground mt-2 tracking-wide">12 categories · everything your car needs</p>
              </div>
              <Link href="/categories">
                <Button variant="ghost" size="sm" className="text-primary gap-1.5 rounded-full tracking-wide">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            {categories.error && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <AlertTriangle className="h-10 w-10 text-destructive/60" />
                <h3 className="font-medium text-lg">Failed to load categories</h3>
                <Button variant="outline" onClick={() => categories.refetch()} className="rounded-full">Retry</Button>
              </div>
            )}
            <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">
              <div className="flex overflow-x-auto scrollbar-hide gap-8 py-6 px-4 sm:px-6 lg:px-8">
                {(categories.data || []).map((cat) => (
                  <CategoryOrb key={cat.id} id={cat.id} name={cat.name} slug={cat.slug} icon={cat.icon} />
                ))}
              </div>
            </div>
            <div className="flex justify-center mt-2 mb-1">
              <div className="swipe-hint">
                <div className="swipe-hint-icon"><ChevronRight className="w-3 h-3" /></div>
                <span>swipe to explore</span>
                <div className="swipe-hint-icon"><ChevronRight className="w-3 h-3" /></div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Engine Parts ── */}
        {(engine.isLoading || engineParts.length > 0) && (
          <section className="zen-section relative">
            <div className="container">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-light text-foreground tracking-wide">Engine &amp; Drivetrain</h2>
                  <p className="text-sm text-muted-foreground mt-2 tracking-wide">Belts, filters, injectors and more</p>
                </div>
                <Link href="/products?category=1">
                  <Button variant="ghost" size="sm" className="text-primary gap-1.5 rounded-full tracking-wide">
                    Browse All <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {engine.isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="aspect-square w-full rounded-2xl" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  {engineParts.slice(0, VISIBLE_COUNT).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Brakes, Suspension & Steering (gated) ── */}
        <section className="zen-section relative">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-light text-foreground tracking-wide">
                  Brakes, Suspension &amp; Steering
                </h2>
                <p className="text-sm text-muted-foreground mt-2 tracking-wide">
                  Top parts for ride control and safety
                </p>
              </div>
              <Link href="/products?category=2">
                <Button variant="ghost" size="sm" className="text-primary gap-1.5 rounded-full tracking-wide">
                  Browse All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {featured.isLoading && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square w-full rounded-2xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {!featured.isLoading && visibleFeatured.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  {visibleFeatured.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Gate for guests */}
                {!isAuthenticated && (
                  <div className="relative mt-5">
                    {gatedFeatured.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 select-none pointer-events-none" aria-hidden="true">
                        {gatedFeatured.slice(0, VISIBLE_COLS).map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    )}
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-end pb-6"
                      style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.65) 35%, rgba(255,255,255,0.97) 70%)" }}
                    >
                      <div className="text-center px-4">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                          <Lock className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="text-lg font-medium tracking-wide mb-1">
                          See all {(featured.data?.length ?? 0) + 100}+ parts
                        </h3>
                        <p className="text-sm text-muted-foreground mb-5 tracking-wide max-w-xs mx-auto">
                          Free account — browse the full catalogue, contact vendors, and track your orders.
                        </p>
                        <div className="flex gap-3 justify-center flex-wrap">
                          <Button size="lg" className="rounded-full px-8 text-white shadow-md" asChild>
                            <Link href="/auth" className="no-underline" data-testid="button-signup-gate">Sign Up Free</Link>
                          </Button>
                          <Button size="lg" variant="outline" className="rounded-full px-6 border-border/40" asChild>
                            <Link href="/auth?mode=login" className="no-underline" data-testid="button-login-gate">Sign In</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isAuthenticated && (
                  <div className="mt-8 text-center">
                    <Button variant="outline" size="lg" className="rounded-full border-border/30 tracking-wide" asChild>
                      <Link href="/products?category=2" className="no-underline">
                        Browse All Suspension Parts <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                )}
              </>
            )}

            {!featured.isLoading && visibleFeatured.length === 0 && (
              <Card className="border-dashed border-border/30">
                <CardContent className="py-20 text-center">
                  <Search className="h-8 w-8 mx-auto mb-4 text-muted-foreground/40" />
                  <p className="text-muted-foreground tracking-wide">No suspension parts listed yet.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>

      {/* ── How it works (for buyers) ── */}
      <section className="py-16 px-5 sm:px-8 bg-background" data-testid="section-how-it-works">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-light tracking-wide text-center mb-2">How it works</h2>
          <p className="text-sm text-muted-foreground text-center mb-12 tracking-wide">
            From search to pickup in three steps.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }, i) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mb-4 relative">
                  <Icon className="h-6 w-6 text-primary" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-medium">
                    {i + 1}
                  </span>
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden sm:block absolute top-7 left-[calc(50%+2.5rem)] right-[calc(-50%+2.5rem)] border-t border-dashed border-border/40" />
                )}
                <h3 className="font-medium text-sm tracking-wide mb-1.5">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed tracking-wide max-w-[200px]">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/products">
              <Button size="lg" className="rounded-full px-8 text-white gap-2 shadow-sm">
                Start Browsing <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Popular Brands marquee ── */}
      <div className="bg-muted/30 border-y border-border/20 py-8 overflow-hidden brand-marquee-wrap" data-testid="section-brands">
        <p className="text-xs text-muted-foreground/50 tracking-widest uppercase text-center mb-6">
          Popular brands stocked by our vendors
        </p>
        <div className="relative overflow-hidden">
          <div className="flex items-center gap-14 brand-marquee w-max px-7">
            {[...BRAND_LOGOS, ...BRAND_LOGOS].map((brand, i) => (
              <Link
                key={i}
                href={`/products?search=${encodeURIComponent(brand.name)}`}
                className="no-underline shrink-0 flex items-center"
                data-testid={`logo-brand-${brand.name}-${i}`}
              >
                <img
                  src={brand.src}
                  alt={brand.name}
                  className="h-9 w-auto object-contain opacity-40 grayscale hover:opacity-90 hover:grayscale-0 transition-all duration-300"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Why VOOM — more specific ── */}
      <section className="zen-hero zen-section" style={{
        background: "linear-gradient(to bottom, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.72) 100%), url('/why-voom-bg.jpg') center 55% / cover no-repeat",
      }}>
        <div className="container relative">
          <h2 className="text-2xl font-light text-white text-center mb-3 tracking-[0.04em]">Why buyers choose VOOM</h2>
          <p className="text-sm text-white/45 text-center mb-12 tracking-wide">No more driving around Abossey Okai hoping to get lucky.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ValueCard
              icon={<ShieldCheck className="h-7 w-7" />}
              title="Ghana Card–verified vendors"
              description="Every seller goes through identity verification before listing. You know exactly who you're buying from."
            />
            <ValueCard
              icon={<MessageCircle className="h-7 w-7" />}
              title="WhatsApp-first contact"
              description="Find your part, tap a button, and you're chatting with the vendor on WhatsApp in seconds. No forms, no waiting."
            />
            <ValueCard
              icon={<TrendingUp className="h-7 w-7" />}
              title="Search by make, model & year"
              description="Filter by your exact vehicle so you only see parts confirmed compatible with your car. No guessing."
            />
          </div>
        </div>
      </section>

      {/* ── MoMo Waitlist ── */}
      <section className="zen-section bg-gradient-to-br from-primary/5 via-background to-background border-y border-border/20" data-testid="section-momo-waitlist">
        <div className="container max-w-xl text-center">
          <div className="w-12 h-12 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-light tracking-wide mb-2">MTN MoMo payments — coming soon</h2>
          <p className="text-sm text-muted-foreground/70 tracking-wide mb-6 leading-relaxed">
            We're building secure mobile money checkout. Leave your number and we'll WhatsApp you the day it launches.
          </p>
          {waitlistDone ? (
            <div className="space-y-3" data-testid="text-waitlist-success">
              <div className="inline-flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200/60 rounded-full px-5 py-2.5 tracking-wide">
                You're on the list! Check WhatsApp — we just sent you the invite.
              </div>
              <div>
                <a
                  href="https://chat.whatsapp.com/IZzVqhrkhxQ04PyznlWD4N"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm bg-voom-green text-white rounded-full px-6 py-2.5 font-medium tracking-wide no-underline hover:bg-voom-green/90 transition-colors"
                  data-testid="link-community-join"
                >
                  <MessageCircle className="h-4 w-4" />
                  Join Our WhatsApp Community
                </a>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 max-w-sm mx-auto">
              <Input
                value={waitlistPhone}
                onChange={(e) => setWaitlistPhone(e.target.value.replace(/[^0-9\s+]/g, ""))}
                placeholder="024 XXX XXXX"
                className="flex-1 h-11 rounded-full text-sm"
                data-testid="input-waitlist-phone"
              />
              <Button
                className="rounded-full h-11 px-5 text-white shrink-0"
                disabled={joinWaitlist.isPending || !waitlistPhone.trim()}
                onClick={() => { if (waitlistPhone.trim()) joinWaitlist.mutate({ phone: waitlistPhone.trim() }); }}
                data-testid="button-waitlist-join"
              >
                {joinWaitlist.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Notify Me"}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── Vendor CTA — high energy ── */}
      <section className="zen-section relative overflow-hidden" style={{ background: "#fff" }}>
        <div className="cta-bg-image" style={{
          position: "absolute", inset: 0,
          backgroundImage: "url('/cta-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "40% center",
          backgroundRepeat: "no-repeat",
        }} />
        <div className="container relative z-10 text-center px-6 sm:px-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 bg-white/80 border border-border/30 rounded-full px-3 py-1 mb-5 tracking-wide backdrop-blur-sm">
            <Zap className="h-3 w-3 text-primary" /> Free to join · 0% Commission · Approved in 24 hrs
          </span>
          <h2 className="text-2xl sm:text-3xl font-light text-foreground mb-3 tracking-wide">
            Sell more parts.<br />Reach all of Ghana.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto mb-8 tracking-wide leading-relaxed">
            Top VOOM vendors earn GH¢ 5,000+ monthly. List your stock in under 10 minutes and start reaching buyers you'd never find offline.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button size="lg" className="rounded-full w-full sm:w-auto gap-2" asChild>
              <Link href="/vendor/register" className="text-white no-underline">
                Partner With Us <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Link href="/vendors" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="rounded-full w-full bg-white/70 backdrop-blur-sm border-border/40">
                See Active Vendors
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center space-y-4 glass-dark rounded-3xl p-8">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-primary/80">
        {icon}
      </div>
      <h3 className="font-medium text-lg text-white tracking-wide">{title}</h3>
      <p className="text-sm text-white/50 leading-relaxed tracking-wide">{description}</p>
    </div>
  );
}
