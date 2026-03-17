import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import ProductCard from "@/components/ProductCard";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { useEffect } from "react";

export default function Wishlist() {
  const { isAuthenticated } = useAuth();
  const wishlist = trpc.wishlist.list.useQuery(undefined, { enabled: isAuthenticated });

  useEffect(() => {
    document.title = "My Wishlist | VOOM Ghana";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", "Your saved spare parts on VOOM Ghana Marketplace.");
    return () => { document.title = "VOOM Ghana — Vehicle Spare Parts Marketplace"; };
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="container py-24 text-center">
        <Heart className="h-12 w-12 mx-auto mb-6 text-muted-foreground/25" />
        <h2 className="text-xl font-light tracking-wide mb-3">Sign in to view your wishlist</h2>
        <p className="text-muted-foreground/60 text-sm tracking-wide mb-8">
          Save parts you love and come back to them anytime.
        </p>
        <Link href="/sign-in">
          <Button className="rounded-full px-8">Sign In</Button>
        </Link>
      </div>
    );
  }

  if (wishlist.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
      </div>
    );
  }

  const items = wishlist.data || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="zen-hero py-14">
        <div className="container">
          <h1 className="text-3xl font-light tracking-wide text-white flex items-center gap-3">
            <Heart className="h-7 w-7 fill-red-400 text-red-400" />
            My Wishlist
          </h1>
          <p className="text-white/50 mt-2 tracking-wide">{items.length} saved {items.length === 1 ? "part" : "parts"}</p>
        </div>
      </div>

      <div className="container py-10">
        {items.length === 0 ? (
          <div className="text-center py-24">
            <Heart className="h-12 w-12 mx-auto mb-6 text-muted-foreground/20" />
            <h2 className="text-xl font-light tracking-wide mb-3">No saved parts yet</h2>
            <p className="text-muted-foreground/60 text-sm tracking-wide mb-8">
              Tap the heart icon on any part to save it here.
            </p>
            <Link href="/products">
              <Button className="rounded-full px-8">Browse Parts</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                vendorName={(product as any).vendorName}
                vendorWhatsapp={(product as any).vendorWhatsapp}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
