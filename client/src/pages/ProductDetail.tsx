import { useAuth } from "@/_core/hooks/useAuth";
import { useWishlist } from "@/contexts/WishlistContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { formatGHS, generateWhatsAppLink } from "@shared/marketplace";
import {
  ShoppingCart, MessageCircle, MapPin, ChevronRight,
  Package, ShieldCheck, Phone, Store, ChevronLeft,
  AlertTriangle, Users, Eye, Ban, Star, Share2,
  Minus, Plus, Hash, Calendar, Tag, Award, TrendingUp, Heart,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useRef, useCallback, useEffect } from "react";

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const stars = [1, 2, 3, 4, 5];
  const cls = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {stars.map((s) => (
        <Star
          key={s}
          className={`${cls} ${s <= Math.round(rating) ? "fill-voom-gold text-voom-gold" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function InteractiveStar({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className="focus:outline-none"
          data-testid={`star-${s}`}
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              s <= (hovered || value) ? "fill-voom-gold text-voom-gold" : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const numId = Number(id);

  const product = trpc.product.getById.useQuery({ id: numId });
  const reviewsQuery = trpc.product.reviews.useQuery({ productId: numId });
  const utils = trpc.useUtils();

  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => {
      toast.success("Added to cart!");
      utils.cart.list.invalidate();
    },
    onError: () => toast.error("Please sign in to add items to cart"),
  });

  const { wishlistedIds, toggle: wishlistToggle } = useWishlist();
  const isWishlisted = isAuthenticated && wishlistedIds.has(numId);

  const submitReview = trpc.product.submitReview.useMutation({
    onSuccess: () => {
      toast.success("Review submitted!");
      utils.product.reviews.invalidate({ productId: numId });
      setReviewRating(0);
      setReviewComment("");
    },
    onError: () => toast.error("Could not submit review"),
  });

  const [selectedImage, setSelectedImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback((idx: number, totalImages: number) => {
    setSelectedImage(Math.max(0, Math.min(totalImages - 1, idx)));
    setDragOffset(0);
    setIsDragging(false);
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    setIsDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.touches[0].clientX - touchStartX.current;
    setDragOffset(Math.max(-120, Math.min(120, delta)));
  }

  function handleTouchEnd(totalImages: number) {
    if (touchStartX.current === null) return;
    const threshold = 60;
    if (dragOffset < -threshold && selectedImage < totalImages - 1) {
      goTo(selectedImage + 1, totalImages);
    } else if (dragOffset > threshold && selectedImage > 0) {
      goTo(selectedImage - 1, totalImages);
    } else {
      setDragOffset(0);
      setIsDragging(false);
    }
    touchStartX.current = null;
  }
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  // SEO: Dynamic title, meta description, and JSON-LD structured data
  useEffect(() => {
    const p = product.data;
    const v = product.data?.vendor;
    if (!p) return;

    const title = `${p.name}${p.vehicleMake ? ` for ${p.vehicleMake}` : ""}${p.vehicleModel ? ` ${p.vehicleModel}` : ""} | VOOM Ghana`;
    document.title = title;

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) { metaDesc = document.createElement("meta"); metaDesc.setAttribute("name", "description"); document.head.appendChild(metaDesc); }
    metaDesc.setAttribute("content", `${p.name} - ${formatGHS(p.price)}. ${p.condition} condition.${p.brand ? ` Brand: ${p.brand}.` : ""}${v ? ` From ${v.businessName} in ${v.city || "Ghana"}.` : ""} Buy vehicle spare parts on VOOM Ghana.`);

    // OG tags
    const ogTags: Record<string, string> = {
      "og:title": title,
      "og:description": `${p.name} - ${formatGHS(p.price)} from ${v?.businessName || "VOOM Ghana"}`,
      "og:type": "product",
    };
    const images = (p.images as string[] | null) || [];
    if (images[0]) ogTags["og:image"] = images[0];

    Object.entries(ogTags).forEach(([property, content]) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute("property", property); document.head.appendChild(tag); }
      tag.setAttribute("content", content);
    });

    // JSON-LD Product structured data
    const reviewCount = p.reviewCount ?? 0;
    const avgRating = p.avgRating ?? 0;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description: p.description || p.name,
      image: images,
      brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
      sku: p.sku || undefined,
      offers: {
        "@type": "Offer",
        price: p.price,
        priceCurrency: "GHS",
        availability: p.quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: p.condition === "new" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
        seller: v ? { "@type": "Organization", name: v.businessName } : undefined,
      },
      aggregateRating: reviewCount > 0 ? {
        "@type": "AggregateRating",
        ratingValue: avgRating,
        reviewCount: reviewCount,
      } : undefined,
    };

    let scriptTag = document.querySelector('script[data-jsonld="product"]');
    if (!scriptTag) { scriptTag = document.createElement("script"); scriptTag.setAttribute("type", "application/ld+json"); scriptTag.setAttribute("data-jsonld", "product"); document.head.appendChild(scriptTag); }
    scriptTag.textContent = JSON.stringify(jsonLd);

    return () => {
      document.title = "VOOM Ghana — Vehicle Spare Parts Marketplace";
      scriptTag?.remove();
    };
  }, [product.data]);

  if (product.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-5xl py-6 px-4">
          <Skeleton className="h-4 w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <Skeleton className="aspect-square w-full rounded-2xl mb-3" />
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="w-14 h-14 rounded-xl flex-shrink-0" />)}
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-full" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const p = product.data;
  if (!p) {
    return (
      <div className="container py-24 text-center">
        <h2 className="text-xl font-light tracking-wide mb-3">Product not found</h2>
        <Link href="/products">
          <Button variant="outline" className="rounded-full border-border/30 tracking-wide">Browse Parts</Button>
        </Link>
      </div>
    );
  }

  const images = (p.images as string[] | null) || [];
  const vendor = p.vendor;
  const outOfStock = p.quantity === 0;
  const avgRating = (p as any).avgRating ?? 0;
  const reviewCount = (p as any).reviewCount ?? 0;
  const vendorProductCount = (p as any).vendorProductCount ?? 0;
  const vendorRating = vendor ? Number(vendor.rating ?? 0) : 0;

  const whatsappMessage = `Hi, I'm interested in "${p.name}" listed at ${formatGHS(p.price)} on VOOM Ghana Marketplace. Is it still available?`;
  const whatsappLink = vendor?.whatsapp ? generateWhatsAppLink(vendor.whatsapp, whatsappMessage) : null;

  function handleAddToCart() {
    if (!isAuthenticated) {
      toast.error("Please sign in to add items to cart");
      return;
    }
    addToCart.mutate({ productId: p!.id, quantity: qty });
  }

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: p!.name, text: `Check out ${p!.name} on VOOM Ghana`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  }

  function handleReviewSubmit() {
    if (!isAuthenticated) {
      toast.error("Please sign in to leave a review");
      return;
    }
    if (reviewRating === 0) {
      toast.error("Please select a star rating");
      return;
    }
    submitReview.mutate({
      productId: p!.id,
      vendorId: p!.vendorId,
      rating: reviewRating,
      comment: reviewComment || undefined,
    });
  }

  const vendorReviews = reviewsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-10">
      {/* ── Sticky header bar ── */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border/20">
        <div className="container max-w-5xl px-4 h-12 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/products" className="flex items-center text-muted-foreground hover:text-primary/90 no-underline flex-shrink-0">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <nav className="flex items-center gap-1 text-xs text-muted-foreground/70 min-w-0" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-primary/90 no-underline whitespace-nowrap">Home</Link>
              <ChevronRight className="h-3 w-3 flex-shrink-0" />
              <Link href="/products" className="hover:text-primary/90 no-underline whitespace-nowrap">Parts</Link>
              <ChevronRight className="h-3 w-3 flex-shrink-0" />
              <span className="text-foreground/80 truncate">{p.name}</span>
            </nav>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => wishlistToggle(numId)}
                className="p-2 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                data-testid="button-wishlist-detail"
                aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
              >
                <Heart className={`h-4 w-4 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
              </button>
            )}
            <button
              onClick={handleShare}
              className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
              data-testid="button-share"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl px-4 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* ── Image gallery ── */}
          <div className="space-y-3">
            {/* Main viewer */}
            <div
              className="aspect-square bg-white/50 backdrop-blur-xl rounded-2xl overflow-hidden shadow-sm relative select-none group"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => handleTouchEnd(images.length)}
              data-testid="gallery-container"
            >
              {/* Image strip — translate to follow drag */}
              <div
                className="w-full h-full"
                style={{
                  transform: `translateX(${dragOffset}px)`,
                  transition: isDragging ? "none" : "transform 280ms cubic-bezier(0.25,0.46,0.45,0.94)",
                }}
              >
                {images.length > 0 ? (
                  <img
                    key={selectedImage}
                    src={images[selectedImage] ?? images[0]}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    data-testid="img-product-main"
                    draggable={false}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div className={`w-full h-full flex items-center justify-center text-muted-foreground bg-muted/20 ${images.length > 0 ? "hidden" : ""}`}>
                  <Package className="h-20 w-20 opacity-20" />
                </div>
              </div>

              {/* Condition badge */}
              <Badge
                variant={p.condition === "new" ? "default" : "secondary"}
                className="absolute top-3 left-3 text-[10px] backdrop-blur-md pointer-events-none"
              >
                {p.condition === "new" ? "Brand New" : p.condition === "used" ? "Used / Tokunbo" : "Refurbished"}
              </Badge>

              {/* Desktop arrow buttons */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => goTo(selectedImage - 1, images.length)}
                    disabled={selectedImage === 0}
                    data-testid="btn-img-prev"
                    aria-label="Previous image"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:!opacity-100 hover:bg-black/60 disabled:opacity-0 transition-all duration-200 hidden md:flex"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => goTo(selectedImage + 1, images.length)}
                    disabled={selectedImage === images.length - 1}
                    data-testid="btn-img-next"
                    aria-label="Next image"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:!opacity-100 hover:bg-black/60 disabled:opacity-0 transition-all duration-200 hidden md:flex"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* Counter + dot indicators */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center gap-1.5 pointer-events-none">
                  <div className="flex items-center gap-1.5">
                    {images.map((_, i) => (
                      <span
                        key={i}
                        className={`rounded-full transition-all duration-200 ${
                          i === selectedImage
                            ? "w-4 h-1.5 bg-white"
                            : "w-1.5 h-1.5 bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="bg-black/50 text-white text-[10px] rounded-full px-2 py-0.5 backdrop-blur-sm tracking-wide">
                    {selectedImage + 1} / {images.length}
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i, images.length)}
                    data-testid={`btn-thumbnail-${i}`}
                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all duration-200 ${
                      i === selectedImage ? "border-primary shadow-sm" : "border-transparent opacity-60 hover:opacity-90"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            {/* ── Specs grid (desktop) ── */}
            <div className="hidden lg:block">
              <SpecsGrid p={p} />
            </div>
          </div>

          {/* ── Product info ── */}
          <div className="space-y-5">
            {p.vehicleMake && (
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
                {p.vehicleMake} {p.vehicleModel}
                {p.yearFrom && ` · ${p.yearFrom}${p.yearTo ? `–${p.yearTo}` : "+"}`}
              </p>
            )}

            <h1 className="text-xl sm:text-2xl md:text-3xl font-light tracking-wide text-foreground leading-snug" data-testid="text-product-name">
              {p.name}
            </h1>

            {/* ── Rating row ── */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <StarRow rating={avgRating} size="sm" />
                <span className="text-xs text-muted-foreground tracking-wide">
                  {reviewCount > 0 ? `${avgRating.toFixed(1)} (${reviewCount} review${reviewCount !== 1 ? "s" : ""})` : "No reviews yet"}
                </span>
              </div>
              {(p.views ?? 0) > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Eye className="h-3 w-3" /> {p.views} views
                </span>
              )}
            </div>

            {/* ── Badges ── */}
            <div className="flex flex-wrap items-center gap-2">
              {p.brand && (
                <Badge variant="outline" className="rounded-full border-border/30 text-xs tracking-wide">
                  <Tag className="h-3 w-3 mr-1" />{p.brand}
                </Badge>
              )}
              {p.sku && (
                <Badge variant="outline" className="rounded-full border-border/30 text-xs tracking-wide font-mono">
                  <Hash className="h-3 w-3 mr-1" />{p.sku}
                </Badge>
              )}
            </div>

            {/* ── Stock status ── */}
            {p.quantity !== undefined && (
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {p.quantity > 0 ? (
                  <>
                    <ShieldCheck className="h-4 w-4 text-voom-green flex-shrink-0" />
                    <span className="text-voom-green" data-testid="status-stock">
                      In Stock
                      {p.quantity <= 10 && ` — only ${p.quantity} left`}
                      {p.quantity > 10 && ` (${p.quantity} available)`}
                    </span>
                  </>
                ) : (
                  <span className="text-destructive" data-testid="status-stock">Out of Stock</span>
                )}
              </div>
            )}

            {/* ── Price + qty ── */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-end justify-between">
                <p className="text-3xl sm:text-4xl font-light tracking-wide text-primary/90" data-testid="text-price">
                  {formatGHS(p.price)}
                </p>
                {p.minOrderQty && p.minOrderQty > 1 && (
                  <span className="text-xs text-muted-foreground tracking-wide">Min. {p.minOrderQty} units</span>
                )}
              </div>
              {!outOfStock && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground tracking-wide">Qty:</span>
                  <div className="flex items-center gap-0 rounded-full border border-border/40 overflow-hidden">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      data-testid="button-qty-minus"
                      className="px-3 h-9 text-muted-foreground hover:bg-muted/40 disabled:opacity-30 transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-4 text-sm font-medium min-w-[2.5rem] text-center" data-testid="text-qty">{qty}</span>
                    <button
                      onClick={() => setQty((q) => Math.min(p!.quantity ?? 99, q + 1))}
                      disabled={qty >= (p.quantity ?? 99)}
                      data-testid="button-qty-plus"
                      className="px-3 h-9 text-muted-foreground hover:bg-muted/40 disabled:opacity-30 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {qty > 1 && (
                    <span className="text-xs text-muted-foreground">
                      = {formatGHS(String(Number(p.price) * qty))}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ── CTAs — desktop ── */}
            <div className="hidden md:flex gap-3">
              <Button
                size="lg"
                className="flex-1 h-12 text-white rounded-full tracking-wide"
                disabled={outOfStock || addToCart.isPending}
                onClick={handleAddToCart}
                data-testid="button-add-to-cart"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {addToCart.isPending ? "Adding…" : outOfStock ? "Out of Stock" : `Add ${qty > 1 ? qty + "× " : ""}to Cart`}
              </Button>
              {whatsappLink && (
                <Button size="lg" variant="outline" className="h-12 px-5 border-voom-green/60 text-voom-green hover:bg-voom-green/5 rounded-full tracking-wide" asChild>
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center no-underline" data-testid="link-whatsapp">
                    <MessageCircle className="h-5 w-5 mr-2" />WhatsApp
                  </a>
                </Button>
              )}
            </div>

            {/* ── Pickup info ── */}
            {vendor?.city && (
              <div className="flex items-start gap-3 rounded-xl border border-border/20 bg-muted/20 p-3.5">
                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium tracking-wide">Pickup available in {vendor.city}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 tracking-wide">
                    Contact the vendor to arrange payment and pickup.
                  </p>
                </div>
              </div>
            )}

            {/* ── Description ── */}
            {p.description && (
              <div>
                <h3 className="font-medium tracking-wide mb-2 text-sm uppercase text-muted-foreground">Description</h3>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{p.description}</p>
              </div>
            )}

            {/* ── Specs grid (mobile) ── */}
            <div className="lg:hidden">
              <SpecsGrid p={p} />
            </div>

            <Separator className="bg-border/20" />

            {/* ── Vendor card ── */}
            {vendor && (
              <Card className="rounded-2xl border-white/20 shadow-sm bg-white/50 backdrop-blur-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Store className="h-6 w-6 text-primary/90" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/vendors/${vendor.id}`}
                        className="font-semibold text-sm tracking-wide text-foreground hover:text-primary/90 no-underline block truncate"
                        data-testid="link-vendor"
                      >
                        {vendor.businessName}
                      </Link>
                      {vendor.city && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 flex-shrink-0" />{vendor.city}, {vendor.region}
                        </p>
                      )}
                      {/* Trust bar */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {vendorRating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-voom-gold text-voom-gold" />
                            <span className="text-xs font-medium text-foreground/80">{vendorRating.toFixed(1)}</span>
                          </div>
                        )}
                        {(vendor.totalSales ?? 0) > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />{vendor.totalSales} sold
                          </div>
                        )}
                        {vendorProductCount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Package className="h-3 w-3" />{vendorProductCount} listing{vendorProductCount !== 1 ? "s" : ""}
                          </div>
                        )}
                        {vendor.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />{vendor.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    <Link href={`/vendors/${vendor.id}`}>
                      <Button variant="outline" size="sm" className="rounded-full border-border/30 text-xs tracking-wide flex-shrink-0" data-testid="button-view-shop">
                        View Shop
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Safety Tips ── */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900/40 p-5" data-testid="section-safety-tips">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <h3 className="font-semibold text-sm tracking-wide text-emerald-800 dark:text-emerald-300 uppercase">Safety Tips</h3>
              </div>
              <div className="flex items-center justify-around mb-5">
                {[
                  { icon: Ban, label: "No fees" },
                  { icon: Users, label: "Bring help" },
                  { icon: Eye, label: "Inspect" },
                  { icon: ShieldCheck, label: "Secure pay" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium tracking-wide">{label}</span>
                  </div>
                ))}
              </div>
              <ul className="space-y-2.5">
                {[
                  "Avoid paying inspection or reservation fees upfront",
                  "Bring a trusted mechanic when collecting parts in person",
                  "Verify the part number matches your vehicle before paying",
                  "Contact the vendor on WhatsApp to arrange payment and pickup",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2.5 text-sm text-emerald-900 dark:text-emerald-200 leading-snug">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Reviews section ── */}
        <div className="mt-12" data-testid="section-reviews">
          <h2 className="text-lg font-light tracking-wide mb-6">
            Reviews
            {reviewCount > 0 && (
              <span className="ml-2 text-sm text-muted-foreground font-normal">({reviewCount})</span>
            )}
          </h2>

          {/* Leave a review */}
          {isAuthenticated && (
            <Card className="rounded-2xl border-white/20 shadow-sm bg-white/50 backdrop-blur-md mb-6">
              <CardContent className="p-5">
                <h3 className="text-sm font-medium tracking-wide mb-3">Leave a Review</h3>
                <div className="space-y-3">
                  <InteractiveStar value={reviewRating} onChange={setReviewRating} />
                  <Textarea
                    placeholder="How was the part? Fit correctly? Good condition?"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="resize-none text-sm rounded-xl border-border/30 bg-white/60"
                    rows={3}
                    data-testid="input-review-comment"
                  />
                  <Button
                    onClick={handleReviewSubmit}
                    disabled={submitReview.isPending || reviewRating === 0}
                    className="rounded-full tracking-wide text-white"
                    data-testid="button-submit-review"
                  >
                    {submitReview.isPending ? "Submitting…" : "Submit Review"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review list */}
          {reviewsQuery.isLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
          ) : vendorReviews.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm tracking-wide">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-20" />
              No reviews yet — be the first!
            </div>
          ) : (
            <div className="space-y-4">
              {vendorReviews.map((r) => (
                <Card key={r.id} className="rounded-2xl border-white/20 shadow-sm bg-white/50 backdrop-blur-md" data-testid={`card-review-${r.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <StarRow rating={r.rating} size="sm" />
                      <span className="text-xs text-muted-foreground tracking-wide">
                        {new Date(r.createdAt).toLocaleDateString("en-GH", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    </div>
                    {r.comment && <p className="text-sm text-foreground/80 leading-relaxed">{r.comment}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ── More from this vendor ── */}
        {vendor && (
          <MoreFromVendor vendorId={vendor.id} vendorName={vendor.businessName} currentProductId={p.id} />
        )}

        {/* ── You May Also Like (same category, other vendors) ── */}
        {p.categoryId && (
          <YouMayAlsoLike productId={p.id} categoryId={p.categoryId} vendorId={p.vendorId} />
        )}
      </div>

      {/* ── Sticky mobile bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-background/95 backdrop-blur-lg border-t border-border/20 px-4 py-3 safe-area-pb">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            size="lg"
            className="flex-1 h-12 text-white rounded-full tracking-wide shadow-md"
            disabled={outOfStock || addToCart.isPending}
            onClick={handleAddToCart}
            data-testid="button-add-to-cart-mobile"
          >
            <ShoppingCart className="h-5 w-5 mr-2 flex-shrink-0" />
            <span className="truncate">
              {addToCart.isPending ? "Adding…" : outOfStock ? "Out of Stock" : `Add ${qty > 1 ? qty + "× " : ""}to Cart`}
            </span>
          </Button>
          {whatsappLink && (
            <Button size="lg" variant="outline" className="h-12 px-4 border-voom-green/60 text-voom-green hover:bg-voom-green/5 rounded-full tracking-wide flex-shrink-0" asChild>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="no-underline flex items-center" data-testid="link-whatsapp-mobile">
                <MessageCircle className="h-5 w-5 mr-1.5" /><span>WhatsApp</span>
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SpecsGrid({ p }: { p: any }) {
  const specs: { icon: any; label: string; value: string }[] = [];

  if (p.sku) specs.push({ icon: Hash, label: "Part No.", value: p.sku });
  if (p.brand) specs.push({ icon: Award, label: "Brand", value: p.brand });
  if (p.yearFrom) {
    specs.push({
      icon: Calendar,
      label: "Year Range",
      value: `${p.yearFrom}${p.yearTo ? `–${p.yearTo}` : "+"}`,
    });
  }
  if (p.vehicleMake) {
    specs.push({ icon: Tag, label: "Compatible", value: `${p.vehicleMake}${p.vehicleModel ? " " + p.vehicleModel : ""}` });
  }

  if (specs.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/20 bg-white/40 backdrop-blur-md overflow-hidden" data-testid="section-specs">
      <div className="px-4 py-3 border-b border-border/10">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Specifications</h3>
      </div>
      <div className="divide-y divide-border/10">
        {specs.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3">
            <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground w-20 flex-shrink-0 tracking-wide">{label}</span>
            <span className="text-sm font-medium tracking-wide text-foreground/90 font-mono">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MoreFromVendor({ vendorId, vendorName, currentProductId }: { vendorId: number; vendorName: string; currentProductId: number }) {
  const vendorProducts = trpc.product.byVendor.useQuery({ vendorId, limit: 8 });
  const others = (vendorProducts.data ?? []).filter((vp) => vp.id !== currentProductId);

  if (vendorProducts.isLoading || others.length === 0) return null;

  return (
    <div className="mt-12" data-testid="section-more-from-vendor">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-light tracking-wide">More from {vendorName}</h2>
        <Link href={`/vendors/${vendorId}`} className="text-xs text-primary hover:underline tracking-wide no-underline">
          View all →
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
        {others.map((vp) => {
          const vpImages = (vp.images as string[] | null) || [];
          return (
            <Link key={vp.id} href={`/products/${vp.id}`} className="no-underline flex-shrink-0 w-40" data-testid={`card-related-${vp.id}`}>
              <div className="rounded-xl overflow-hidden border border-border/20 bg-white/50 backdrop-blur-md hover:shadow-md transition-all duration-200 group">
                <div className="aspect-square bg-muted/20 relative overflow-hidden">
                  {vpImages[0] ? (
                    <img
                      src={vpImages[0]}
                      alt={vp.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 opacity-20 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium line-clamp-2 leading-snug text-foreground/90 tracking-wide">{vp.name}</p>
                  <p className="text-xs text-primary font-medium mt-1 tracking-wide">{formatGHS(vp.price)}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function YouMayAlsoLike({ productId, categoryId, vendorId }: { productId: number; categoryId: number; vendorId: number }) {
  const related = trpc.product.related.useQuery({ productId, categoryId, vendorId, limit: 8 });

  if (related.isLoading) return null;
  const items = related.data || [];
  if (items.length === 0) return null;

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-light tracking-widest uppercase text-foreground/70">You May Also Like</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {items.map((rp) => {
          const rpImages = (rp.images as string[] | null) || [];
          return (
            <Link key={rp.id} href={`/products/${rp.id}`} className="no-underline flex-shrink-0 w-40 snap-start" data-testid={`card-youmaylike-${rp.id}`}>
              <div className="rounded-xl overflow-hidden border border-border/20 bg-white/50 backdrop-blur-md hover:shadow-md transition-all duration-200 group">
                <div className="aspect-square bg-muted/20 relative overflow-hidden">
                  {rpImages[0] ? (
                    <img
                      src={rpImages[0]}
                      alt={rp.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 opacity-20 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium line-clamp-2 leading-snug text-foreground/90 tracking-wide">{rp.name}</p>
                  <p className="text-xs text-primary font-medium mt-1 tracking-wide">{formatGHS(rp.price)}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
