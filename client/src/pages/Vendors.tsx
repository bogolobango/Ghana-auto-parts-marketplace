import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { MapPin, Star, Store, ChevronRight, AlertTriangle, BadgeCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function Vendors() {
  const vendors = trpc.vendor.list.useQuery();

  useEffect(() => {
    document.title = "Verified Auto Parts Vendors in Ghana | VOOM Ghana";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", "Browse Ghana Card–verified spare parts dealers across all 16 regions of Ghana. Find Toyota, Honda, Mercedes, Nissan parts vendors in Accra, Kumasi, Takoradi and more. Contact on WhatsApp instantly.");
    return () => { document.title = "VOOM Ghana — Vehicle Spare Parts Marketplace"; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="zen-hero py-16">
        <div className="container">
          <h1 className="text-3xl font-light tracking-wide text-white">Verified Vendors</h1>
          <p className="text-white/50 mt-3 tracking-wide">Trusted spare parts dealers across Ghana</p>
        </div>
      </div>

      <div className="container py-12">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground/70 mb-8" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Vendors</span>
        </nav>

        {vendors.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="zen-card glass rounded-2xl border-white/20 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-14 h-14 rounded-2xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : vendors.error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertTriangle className="h-10 w-10 text-destructive/60" />
            <h3 className="font-medium text-lg">Failed to load vendors</h3>
            <p className="text-sm text-muted-foreground">{vendors.error.message}</p>
            <Button variant="outline" onClick={() => vendors.refetch()} className="rounded-full">
              Retry
            </Button>
          </div>
        ) : (vendors.data?.length || 0) > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.data?.map((vendor) => (
              <Link key={vendor.id} href={`/vendors/${vendor.id}`} className="no-underline">
                <Card className="zen-card glass rounded-2xl border-white/20 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] hover:border-primary/30 transition-all duration-300 h-full group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                        {vendor.logoUrl ? (
                          <img src={vendor.logoUrl} alt={vendor.businessName + " logo"} loading="lazy" className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                          <Store className="h-7 w-7 text-primary/90" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium tracking-wide text-foreground group-hover:text-primary/90 transition-colors truncate">
                            {vendor.businessName}
                          </h3>
                          {vendor.verified && (
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-400/30 rounded-full text-[10px] px-2 py-0.5 flex-shrink-0">
                              <BadgeCheck className="h-3 w-3 mr-1" /> Verified
                            </Badge>
                          )}
                        </div>
                        {vendor.city && (
                          <p className="text-sm text-muted-foreground/80 flex items-center gap-1 mt-1.5 tracking-wide">
                            <MapPin className="h-3.5 w-3.5" /> {vendor.city}, {vendor.region}
                          </p>
                        )}
                        {vendor.description && (
                          <p className="text-sm text-muted-foreground/70 mt-2.5 line-clamp-2 tracking-wide">{vendor.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-4">
                          <Badge variant="secondary" className="text-xs rounded-full">
                            <Star className="h-3 w-3 mr-1 text-voom-gold" />
                            {vendor.rating || "New"}
                          </Badge>
                          <span className="text-xs text-muted-foreground/70 tracking-wide">
                            {vendor.totalSales || 0} sales
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-white/20 glass rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
            <CardContent className="py-20 text-center">
              <Store className="h-10 w-10 mx-auto mb-5 text-muted-foreground/30" />
              <h3 className="font-medium tracking-wide text-lg mb-2">No vendors yet</h3>
              <p className="text-muted-foreground/70 text-sm tracking-wide">Be the first to register as a vendor on VOOM.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
