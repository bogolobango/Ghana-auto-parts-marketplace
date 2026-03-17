import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import ProductCard from "@/components/ProductCard";
import { generateWhatsAppLink } from "@shared/marketplace";
import {
  MapPin, Phone, MessageCircle, Star, Store, ArrowLeft, Loader2, Mail, ShieldCheck,
} from "lucide-react";
import { useEffect } from "react";

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const vendor = trpc.vendor.getById.useQuery({ id: Number(id) });
  const products = trpc.product.search.useQuery({ vendorId: Number(id) });

  const v = vendor.data;
  useEffect(() => {
    if (!v) return;
    const title = `${v.businessName} — Auto Parts${v.city ? " in " + v.city : ""} | VOOM Ghana`;
    document.title = title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", `Shop spare parts from ${v.businessName}${v.city ? " in " + v.city : " in Ghana"}. ${v.description || "Verified auto parts dealer on VOOM Ghana."} Contact directly on WhatsApp.`);
    return () => { document.title = "VOOM Ghana — Vehicle Spare Parts Marketplace"; };
  }, [v]);

  if (vendor.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/90" />
      </div>
    );
  }

  if (!v) {
    return (
      <div className="container py-24 text-center">
        <h2 className="text-xl font-medium tracking-wide mb-3">Vendor not found</h2>
        <Link href="/vendors"><Button variant="outline" className="rounded-full border-white/20">Browse Vendors</Button></Link>
      </div>
    );
  }

  const whatsappLink = v.whatsapp ? generateWhatsAppLink(v.whatsapp, `Hi, I found your shop on VOOM Ghana Marketplace. I'd like to inquire about your car parts.`) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="zen-hero py-14">
        <div className="container">
          <Link href="/vendors" className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/90 no-underline mb-5 tracking-wide transition-colors">
            <ArrowLeft className="h-4 w-4" /> All Vendors
          </Link>
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              {v.logoUrl ? (
                <img src={v.logoUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <Store className="h-8 w-8 text-primary/90" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-light tracking-wide text-white">{v.businessName}</h1>
                {v.verified && (
                  <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/40 rounded-full text-xs">
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Verified Vendor
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {v.city && (
                  <span className="text-sm text-white/50 flex items-center gap-1 tracking-wide">
                    <MapPin className="h-3.5 w-3.5" /> {v.city}, {v.region}
                  </span>
                )}
                <Badge variant="secondary" className="text-xs rounded-full">
                  <Star className="h-3 w-3 mr-1 text-voom-gold" />
                  {v.rating || "New Vendor"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="space-y-5">
            {v.description && (
              <Card className="glass rounded-2xl border-white/20 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
                <CardContent className="p-5">
                  <h3 className="font-medium tracking-wide mb-3">About</h3>
                  <p className="text-sm text-muted-foreground/80 tracking-wide leading-relaxed">{v.description}</p>
                </CardContent>
              </Card>
            )}

            <Card className="glass rounded-2xl border-white/20 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-medium tracking-wide">Contact</h3>
                {v.phone && (
                  <a href={`tel:${v.phone}`} className="flex items-center gap-2.5 text-sm text-muted-foreground/80 hover:text-primary/90 no-underline tracking-wide transition-colors">
                    <Phone className="h-4 w-4" /> {v.phone}
                  </a>
                )}
                {v.email && (
                  <a href={`mailto:${v.email}`} className="flex items-center gap-2.5 text-sm text-muted-foreground/80 hover:text-primary/90 no-underline tracking-wide transition-colors">
                    <Mail className="h-4 w-4" /> {v.email}
                  </a>
                )}
                {whatsappLink && (
                  <Button variant="outline" className="w-full rounded-full border-voom-green/60 text-voom-green hover:bg-voom-green/5" asChild>
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="no-underline">
                      <MessageCircle className="h-4 w-4 mr-2" /> Chat on WhatsApp
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="glass rounded-2xl border-white/20 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-medium tracking-wide">Stats</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground/70 tracking-wide">Products</span>
                  <span className="font-medium tracking-wide">{products.data?.total || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground/70 tracking-wide">Total Sales</span>
                  <span className="font-medium tracking-wide">{v.totalSales || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground/70 tracking-wide">Member Since</span>
                  <span className="font-medium tracking-wide">{new Date(v.createdAt).toLocaleDateString("en-GH", { year: "numeric", month: "short" })}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products */}
          <div className="lg:col-span-3">
            <h2 className="text-xl font-light tracking-wide mb-6">Products ({products.data?.total || 0})</h2>
            {(products.data?.products.length || 0) > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {products.data?.products.map((product) => (
                  <ProductCard key={product.id} product={product} vendorWhatsapp={v.whatsapp ?? undefined} vendorName={v.businessName} />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-white/20 glass rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
                <CardContent className="py-16 text-center">
                  <p className="text-muted-foreground/70 tracking-wide">This vendor hasn't listed any products yet.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
