import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { formatGHS, generateWhatsAppLink, GHANA_REGIONS, GHANA_CITIES } from "@shared/marketplace";
import { MessageCircle, Loader2, CheckCircle2, Package, Smartphone, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useGuestCart, type GuestCartItem } from "@/hooks/useGuestCart";

export default function Checkout() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const cart = trpc.cart.list.useQuery(undefined, { enabled: isAuthenticated });
  const createOrder = trpc.order.create.useMutation();
  const joinWaitlist = trpc.waitlist.join.useMutation();
  const utils = trpc.useUtils();
  const guestCart = useGuestCart();

  const [form, setForm] = useState({
    buyerName: user?.name || "",
    buyerPhone: "",
    shippingAddress: "",
    shippingCity: "",
    shippingRegion: "",
    notes: "",
  });
  const [orderResult, setOrderResult] = useState<{
    orderNumber?: string;
    whatsappLinks: { vendorName: string; link: string }[];
    isGuest?: boolean;
  } | null>(null);
  const [waitlistPhone, setWaitlistPhone] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isGuest = !isAuthenticated;

  const serverItems = cart.data || [];
  const serverTotal = serverItems.reduce((sum, item) => {
    return sum + (item.product ? parseFloat(item.product.price) * item.quantity : 0);
  }, 0);

  type ServerCartItem = (typeof serverItems)[number];

  const serverVendorGroups = new Map<number, ServerCartItem[]>();
  serverItems.forEach((item) => {
    if (item.product) {
      const vid = item.product.vendorId;
      if (!serverVendorGroups.has(vid)) serverVendorGroups.set(vid, []);
      serverVendorGroups.get(vid)!.push(item);
    }
  });

  const guestVendorGroups = new Map<number, GuestCartItem[]>();
  guestCart.items.forEach((item) => {
    if (!guestVendorGroups.has(item.vendorId)) guestVendorGroups.set(item.vendorId, []);
    guestVendorGroups.get(item.vendorId)!.push(item);
  });

  const hasItems = isGuest ? guestCart.items.length > 0 : serverItems.length > 0;
  const total = isGuest ? guestCart.total : serverTotal;
  const vendorGroupCount = isGuest ? guestVendorGroups.size : serverVendorGroups.size;

  const handleSubmitAuth = async () => {
    if (!form.buyerName || !form.buyerPhone) {
      toast.error("Please fill in your name and phone number");
      return;
    }
    setIsSubmitting(true);
    try {
      const whatsappLinks: { vendorName: string; link: string }[] = [];
      let lastOrderNumber = "";

      for (const [vendorId, vendorItems] of Array.from(serverVendorGroups.entries())) {
        const orderItems = vendorItems.map((item) => ({
          productId: item.product!.id,
          productName: item.product!.name,
          quantity: item.quantity,
          unitPrice: item.product!.price,
          totalPrice: (parseFloat(item.product!.price) * item.quantity).toFixed(2),
        }));

        const result = await createOrder.mutateAsync({
          vendorId,
          paymentMethod: "pay_on_delivery" as const,
          ...form,
          items: orderItems,
        });

        lastOrderNumber = result.orderNumber || "";

        const itemsList = vendorItems.map((vi) =>
          `- ${vi.product!.name} x${vi.quantity} @ ${formatGHS(vi.product!.price)}`
        ).join("\n");
        const vendorTotal = vendorItems.reduce((s, vi) => s + parseFloat(vi.product!.price) * vi.quantity, 0);

        const msg = `🛒 *New VOOM Order: ${lastOrderNumber}*\n\nBuyer: ${form.buyerName}\nPhone: ${form.buyerPhone}\n\nItems:\n${itemsList}\n\n*Total: ${formatGHS(vendorTotal)}*\n\nShipping to: ${form.shippingAddress || "TBD"}, ${form.shippingCity || "TBD"}, ${form.shippingRegion || "TBD"}\n\n${form.notes ? `Notes: ${form.notes}` : ""}`;

        if (result.vendorWhatsapp) {
          whatsappLinks.push({ vendorName: result.vendorName || "Vendor", link: generateWhatsAppLink(result.vendorWhatsapp, msg) });
        }
      }

      utils.cart.list.invalidate();
      setOrderResult({ orderNumber: lastOrderNumber, whatsappLinks });
      toast.success("Order placed successfully!");
    } catch {
      toast.error("Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitGuest = () => {
    if (!form.buyerName || !form.buyerPhone) {
      toast.error("Please fill in your name and phone number");
      return;
    }
    const whatsappLinks: { vendorName: string; link: string }[] = [];
    for (const [, vendorItems] of Array.from(guestVendorGroups.entries())) {
      const vendorName = vendorItems[0]?.vendorName || "Vendor";
      const vendorWhatsapp = vendorItems[0]?.vendorWhatsapp;
      if (!vendorWhatsapp) continue;

      const itemsList = vendorItems.map(vi => `- ${vi.productName} x${vi.quantity} @ ${formatGHS(vi.price)}`).join("\n");
      const vendorTotal = vendorItems.reduce((s, vi) => s + parseFloat(vi.price) * vi.quantity, 0);
      const guestRef = `VOOM-GUEST-${Date.now().toString(36).toUpperCase()}`;
      const msg = `🛒 *VOOM Order Enquiry: ${guestRef}*\n\nBuyer: ${form.buyerName}\nPhone: ${form.buyerPhone}\n\nItems:\n${itemsList}\n\n*Total: ${formatGHS(vendorTotal)}*\n\n${form.shippingAddress ? `Shipping to: ${form.shippingAddress}, ${form.shippingCity}, ${form.shippingRegion}\n\n` : ""}${form.notes ? `Notes: ${form.notes}` : ""}`;

      whatsappLinks.push({ vendorName, link: generateWhatsAppLink(vendorWhatsapp, msg) });
    }

    guestCart.clearCart();
    setOrderResult({ whatsappLinks, isGuest: true });
    toast.success("Order sent via WhatsApp!");
  };

  const handleWaitlistJoin = () => {
    if (!waitlistPhone) return;
    joinWaitlist.mutate(
      { phone: waitlistPhone },
      {
        onSuccess: () => { setWaitlistSubmitted(true); toast.success("You're on the list!"); },
        onError: () => toast.error("Could not join waitlist"),
      }
    );
  };

  if (!isGuest && cart.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
      </div>
    );
  }

  if (orderResult) {
    return (
      <div className="container py-24 text-center max-w-md mx-auto">
        <div className="w-16 h-16 mx-auto mb-8 rounded-full bg-emerald-500/10 backdrop-blur-sm flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500/80" />
        </div>
        <h1 className="text-2xl font-light tracking-wide mb-3">
          {orderResult.isGuest ? "Enquiry Sent!" : "Order Placed!"}
        </h1>
        {orderResult.orderNumber && (
          <p className="text-muted-foreground/70 tracking-wide mb-2">
            Order Number: <span className="font-medium">{orderResult.orderNumber}</span>
          </p>
        )}
        <p className="text-sm text-muted-foreground/60 tracking-wide mb-8">
          {orderResult.whatsappLinks.length > 0
            ? "Tap below to open WhatsApp and confirm your order with the vendor."
            : "No vendor WhatsApp numbers found. Please contact vendors directly."}
        </p>

        <div className="space-y-3 mb-8">
          {orderResult.whatsappLinks.map((wl, idx) => (
            <a
              key={idx}
              href={wl.link}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`link-wa-vendor-${idx}`}
              className="flex items-center justify-center gap-2 w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium tracking-wide transition-colors no-underline"
            >
              <MessageCircle className="h-5 w-5" />
              Contact {wl.vendorName} on WhatsApp
            </a>
          ))}
        </div>

        {!waitlistSubmitted ? (
          <Card className="rounded-2xl border-primary/20 bg-primary/5 text-left">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <p className="font-medium tracking-wide text-sm">Want to pay via MTN MoMo?</p>
              </div>
              <p className="text-xs text-muted-foreground/70 mb-3 tracking-wide">
                Secure mobile money checkout is launching soon. We'll notify you when it's live.
              </p>
              <div className="flex gap-2">
                <Input
                  value={waitlistPhone}
                  onChange={(e) => setWaitlistPhone(e.target.value.replace(/[^0-9\s-]/g, ""))}
                  placeholder="024 XXX XXXX"
                  className="flex-1 h-10 rounded-full text-sm"
                  data-testid="input-waitlist-phone"
                />
                <Button size="sm" className="rounded-full text-white h-10 px-4" disabled={joinWaitlist.isPending || !waitlistPhone} onClick={handleWaitlistJoin}>
                  {joinWaitlist.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Notify Me"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-2xl border-emerald-300/30 bg-emerald-50/50 p-4 text-sm text-emerald-700 tracking-wide space-y-3">
            <p>You're on the list! We'll WhatsApp you when MoMo payments go live.</p>
            <a href="https://chat.whatsapp.com/IZzVqhrkhxQ04PyznlWD4N" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-500 text-white rounded-full px-4 py-2 text-xs font-medium no-underline hover:bg-emerald-600 transition-colors">
              <MessageCircle className="h-3.5 w-3.5" /> Join our WhatsApp Community
            </a>
          </div>
        )}

        <div className="space-y-3 mt-8">
          {!orderResult.isGuest && (
            <Button className="w-full h-12 rounded-full" variant="outline" onClick={() => navigate("/orders")}>
              View My Orders
            </Button>
          )}
          <Button variant="ghost" className="w-full h-12 rounded-full" onClick={() => navigate("/products")}>
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  if (!hasItems) {
    return (
      <div className="container py-24 text-center">
        <Package className="h-12 w-12 mx-auto mb-6 text-muted-foreground/30" />
        <h2 className="text-xl font-light tracking-wide mb-3">Your cart is empty</h2>
        <p className="text-muted-foreground/60 text-sm tracking-wide mb-8">
          Browse parts and add them to your cart to continue.
        </p>
        <Link href="/products">
          <Button className="rounded-full px-8">Browse Parts</Button>
        </Link>
      </div>
    );
  }

  const displayItems = isGuest
    ? guestCart.items.map(i => ({ id: i.localId, name: i.productName, price: i.price, quantity: i.quantity }))
    : serverItems.map(i => ({ id: String(i.id), name: i.product?.name || "", price: i.product?.price || "0", quantity: i.quantity }));

  return (
    <div className="min-h-screen bg-background/50">
      <div className="container py-10">
        <h1 className="text-2xl font-light tracking-wide mb-2">Checkout</h1>
        {isGuest && (
          <p className="text-sm text-muted-foreground/70 mb-6 tracking-wide">
            Checking out as guest · <Link href="/sign-in" className="text-primary hover:underline">Sign in</Link> for order tracking
          </p>
        )}

        {vendorGroupCount > 1 && (
          <div className="mb-8 rounded-2xl border border-amber-300/50 bg-amber-50/80 backdrop-blur-sm p-5 flex items-start gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5">⚠</span>
            <div>
              <p className="font-semibold tracking-wide text-amber-900">Multiple vendors</p>
              <p className="text-sm text-amber-800/70 mt-1 tracking-wide">
                Your cart has items from {vendorGroupCount} vendors. A separate WhatsApp message will be sent to each.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="zen-card glass rounded-2xl border-white/20 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
              <CardHeader className="pb-4">
                <CardTitle className="font-medium tracking-wide">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <Label className="tracking-wide">Full Name *</Label>
                    <Input value={form.buyerName} onChange={(e) => setForm({ ...form, buyerName: e.target.value })} placeholder="Your full name" data-testid="input-buyer-name" />
                  </div>
                  <div>
                    <Label className="tracking-wide">Phone Number *</Label>
                    <Input value={form.buyerPhone} type="tel" inputMode="numeric" onChange={(e) => setForm({ ...form, buyerPhone: e.target.value.replace(/[^0-9\s+-]/g, "") })} placeholder="e.g. 0241234567" data-testid="input-buyer-phone" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="zen-card glass rounded-2xl border-white/20 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
              <CardHeader className="pb-4">
                <CardTitle className="font-medium tracking-wide">Delivery Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label className="tracking-wide">Address</Label>
                  <Input value={form.shippingAddress} onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })} placeholder="Street address or landmark" data-testid="input-shipping-address" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <Label className="tracking-wide">City</Label>
                    <Select value={form.shippingCity} onValueChange={(v) => setForm({ ...form, shippingCity: v })}>
                      <SelectTrigger data-testid="select-city"><SelectValue placeholder="Select city" /></SelectTrigger>
                      <SelectContent>{GHANA_CITIES.map((city) => (<SelectItem key={city} value={city}>{city}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="tracking-wide">Region</Label>
                    <Select value={form.shippingRegion} onValueChange={(v) => setForm({ ...form, shippingRegion: v })}>
                      <SelectTrigger data-testid="select-region"><SelectValue placeholder="Select region" /></SelectTrigger>
                      <SelectContent>{GHANA_REGIONS.map((region) => (<SelectItem key={region} value={region}>{region}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="tracking-wide">Notes (optional)</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any special instructions…" rows={3} data-testid="input-notes" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-emerald-200/40 bg-emerald-50/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  <p className="font-medium tracking-wide text-sm text-emerald-900">How ordering works</p>
                </div>
                <ol className="text-xs text-emerald-800/70 tracking-wide space-y-1.5 list-decimal list-inside">
                  <li>Fill in your contact details above</li>
                  <li>Click "Place Order" to get a WhatsApp link to the vendor</li>
                  <li>Confirm order details and arrange payment with the vendor</li>
                  <li>Secure MoMo checkout coming soon!</li>
                </ol>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-20 glass-strong rounded-3xl border-white/20 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium tracking-wide">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2.5">
                  {displayItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground/70 tracking-wide truncate mr-2">
                        {item.name} x{item.quantity}
                      </span>
                      <span className="font-medium tracking-wide flex-shrink-0">
                        {formatGHS(parseFloat(item.price) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <Separator className="bg-border/30" />
                <div className="flex justify-between font-medium tracking-wide text-lg">
                  <span>Total</span>
                  <span className="text-primary/90">{formatGHS(total)}</span>
                </div>
                <Button
                  className="w-full h-12 text-white rounded-full"
                  size="lg"
                  disabled={isSubmitting}
                  onClick={isGuest ? handleSubmitGuest : handleSubmitAuth}
                  data-testid="button-place-order"
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Placing Order…</>
                  ) : (
                    <><ShoppingBag className="h-4 w-4 mr-2" /> Place Order</>
                  )}
                </Button>
                <div className="flex items-center gap-2 text-xs text-muted-foreground/60 tracking-wide justify-center">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Vendor confirmed via WhatsApp
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
