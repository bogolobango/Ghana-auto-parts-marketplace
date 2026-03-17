import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { MapPin, Package, MessageCircle, Hash, Star, Heart } from "lucide-react";
import { formatGHS, generateWhatsAppLink } from "@shared/marketplace";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWishlist } from "@/contexts/WishlistContext";
import type { Product } from "../../../drizzle/schema";

interface ProductCardProps {
  product: Product;
  vendorName?: string;
  vendorWhatsapp?: string;
  avgRating?: number;
  reviewCount?: number;
}

export default function ProductCard({ product, vendorName, vendorWhatsapp, avgRating, reviewCount }: ProductCardProps) {
  const { isAuthenticated } = useAuth();
  const { wishlistedIds, toggle } = useWishlist();
  const isWishlisted = isAuthenticated && wishlistedIds.has(product.id);

  const images = (product.images as string[] | null) || [];
  const firstImage = images[0];
  const hasMultipleImages = images.length > 1;

  const whatsappMessage = `Hi, I'm interested in "${product.name}" listed at ${formatGHS(product.price)} on VOOM Ghana Marketplace. Is it still available?`;
  const whatsappLink = vendorWhatsapp ? generateWhatsAppLink(vendorWhatsapp, whatsappMessage) : null;

  return (
    <Link href={`/products/${product.id}`} className="no-underline group">
      <Card className="overflow-hidden border-white/20 hover:shadow-[0_12px_40px_-6px_rgba(0,0,0,0.08)] transition-all duration-400 h-full zen-card">
        {/* Image */}
        <div className="aspect-square bg-muted/30 relative overflow-hidden rounded-t-3xl">
          {firstImage ? (
            <img
              src={firstImage}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-600 ease-out"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
              }}
            />
          ) : null}
          <div className={`w-full h-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-white/40 to-white/20 ${firstImage ? "hidden" : ""}`}>
            <Package className="w-12 h-12 opacity-20" />
          </div>

          {/* Condition Badge */}
          <Badge
            variant={product.condition === "new" ? "default" : "secondary"}
            className="absolute top-3 left-3 text-[10px] font-medium backdrop-blur-md"
          >
            {product.condition === "new" ? "New" : product.condition === "used" ? "Used" : "Refurb"}
          </Badge>

          {product.featured && !isAuthenticated && (
            <Badge className="absolute top-3 right-3 bg-voom-gold/85 text-voom-navy text-[10px] font-medium backdrop-blur-md">
              Featured
            </Badge>
          )}

          {/* Wishlist heart — auth users only */}
          {isAuthenticated && (
            <button
              type="button"
              data-testid={`button-wishlist-${product.id}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(product.id); }}
              className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md bg-white/70 border border-white/40 shadow-sm hover:scale-110 transition-transform"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={`h-3.5 w-3.5 ${isWishlisted ? "fill-red-500 text-red-500" : "text-muted-foreground/60"}`} />
            </button>
          )}

          {/* Image count pill */}
          {hasMultipleImages && (
            <span className="absolute bottom-2.5 right-2.5 bg-black/45 text-white text-[10px] rounded-full px-2 py-0.5 backdrop-blur-sm tracking-wide">
              {images.length} photos
            </span>
          )}

          {/* WhatsApp quick-action — always visible on mobile, hover on desktop */}
          {whatsappLink && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(whatsappLink, "_blank", "noopener,noreferrer"); }}
              data-testid={`link-wa-quick-${product.id}`}
              className="absolute bottom-2.5 left-2.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 bg-transparent border-0 p-0 cursor-pointer"
              title="Chat on WhatsApp"
            >
              <span className="flex items-center gap-1 bg-voom-green text-white text-[10px] rounded-full px-2.5 py-1 backdrop-blur-sm font-medium tracking-wide shadow">
                <MessageCircle className="h-3 w-3" />
                Chat
              </span>
            </button>
          )}
        </div>

        <CardContent className="p-4 space-y-1.5">
          {/* Vehicle compatibility */}
          {product.vehicleMake && (
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              {product.vehicleMake} {product.vehicleModel}
              {product.yearFrom && ` (${product.yearFrom}${product.yearTo ? `–${product.yearTo}` : "+"})`}
            </p>
          )}

          {/* Name */}
          <h3 className="font-medium text-sm text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-300 tracking-wide">
            {product.name}
          </h3>

          {/* Brand + SKU row */}
          <div className="flex items-center gap-2 flex-wrap">
            {product.brand && (
              <span className="text-[10px] text-muted-foreground tracking-wide">{product.brand}</span>
            )}
            {product.sku && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70 font-mono">
                <Hash className="h-2.5 w-2.5" />{product.sku}
              </span>
            )}
          </div>

          {/* Rating row */}
          {avgRating !== undefined && reviewCount !== undefined && reviewCount > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-voom-gold text-voom-gold" />
              <span className="text-[10px] text-muted-foreground tracking-wide">
                {avgRating.toFixed(1)} ({reviewCount})
              </span>
            </div>
          )}

          {/* Price + stock */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-base font-semibold text-primary tracking-wide">
              {formatGHS(product.price)}
            </span>
            {product.quantity !== undefined && product.quantity <= 5 && product.quantity > 0 && (
              <span className="text-[10px] text-destructive/80 font-medium tracking-wide">
                Only {product.quantity} left
              </span>
            )}
            {product.quantity === 0 && (
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide">Out of stock</span>
            )}
          </div>

          {/* Vendor */}
          {vendorName && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-0.5 tracking-wide">
              <MapPin className="h-3 w-3" /> {vendorName}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
