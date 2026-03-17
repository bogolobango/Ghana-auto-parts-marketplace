import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { formatGHS } from "@shared/marketplace";
import {
  Package, ShoppingCart, Plus, Loader2, Store, TrendingUp,
  Trash2, Eye, ImageIcon, Pencil, ToggleLeft,
  ToggleRight, Search, Phone, MapPin, ChevronDown, ChevronUp,
  Star, CheckCircle2, Clock, Truck, Ban, RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: "Pending",    color: "bg-amber-500/10 text-amber-600 border-amber-200",    icon: <Clock className="h-3 w-3" /> },
  confirmed:  { label: "Confirmed",  color: "bg-blue-500/10 text-blue-600 border-blue-200",       icon: <CheckCircle2 className="h-3 w-3" /> },
  processing: { label: "Processing", color: "bg-violet-500/10 text-violet-600 border-violet-200", icon: <RotateCcw className="h-3 w-3" /> },
  shipped:    { label: "Shipped",    color: "bg-sky-500/10 text-sky-600 border-sky-200",          icon: <Truck className="h-3 w-3" /> },
  delivered:  { label: "Delivered",  color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled:  { label: "Cancelled",  color: "bg-red-500/10 text-red-500 border-red-200",          icon: <Ban className="h-3 w-3" /> },
};

const ORDER_FILTERS = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;

// ── Main component ────────────────────────────────────────────────────────────
export default function VendorDashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const vendor     = trpc.vendor.me.useQuery(undefined, { enabled: isAuthenticated });
  const myProducts = trpc.product.myProducts.useQuery(undefined, { enabled: !!vendor.data && vendor.data.status === "approved" });
  const vendorOrders = trpc.order.vendorOrders.useQuery(undefined, { enabled: !!vendor.data && vendor.data.status === "approved" });
  const utils = trpc.useUtils();

  // filter / search state
  const [productSearch, setProductSearch] = useState("");
  const [orderFilter,   setOrderFilter]   = useState<typeof ORDER_FILTERS[number]>("all");

  // inline qty edit
  const [editingQtyId, setEditingQtyId] = useState<number | null>(null);
  const [editingQtyVal, setEditingQtyVal] = useState("");

  // expanded order cards
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  // ── mutations ─────────────────────────────────────────────────────────────
  const updateProduct  = trpc.product.update.useMutation({
    onSuccess: () => { utils.product.myProducts.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteProduct  = trpc.product.delete.useMutation({
    onSuccess: () => { utils.product.myProducts.invalidate(); toast.success("Product removed"); },
  });
  const updateOrderStatus = trpc.order.updateStatus.useMutation({
    onSuccess: () => { utils.order.vendorOrders.invalidate(); toast.success("Order updated"); },
  });

  // ── helpers ───────────────────────────────────────────────────────────────
  const openAdd  = () => navigate("/vendor/new-part");
  const openEdit = (p: any) => navigate(`/vendor/edit-part/${p.id}`);

  const toggleProductStatus = (p: any) => {
    const next = p.status === "active" ? "inactive" : "active";
    updateProduct.mutate({ id: p.id, status: next }, {
      onSuccess: () => { utils.product.myProducts.invalidate(); toast.success(`Listing ${next === "active" ? "activated" : "paused"}`); },
    });
  };

  const saveInlineQty = (id: number) => {
    const qty = parseInt(editingQtyVal);
    if (isNaN(qty) || qty < 0) { toast.error("Enter a valid quantity"); return; }
    updateProduct.mutate({ id, quantity: qty }, {
      onSuccess: () => { utils.product.myProducts.invalidate(); setEditingQtyId(null); },
    });
  };

  const toggleOrderExpand = (id: number) =>
    setExpandedOrders(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── derived data ──────────────────────────────────────────────────────────
  if (loading || vendor.isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary/80" /></div>;
  }

  if (!vendor.data || vendor.data.status !== "approved") {
    return (
      <div className="container py-24 text-center">
        <Store className="h-12 w-12 mx-auto mb-6 text-muted-foreground/30" />
        <h2 className="text-xl font-light tracking-wide mb-3">{vendor.data ? "Application Pending" : "Not a Vendor"}</h2>
        <p className="text-muted-foreground text-sm tracking-wide mb-8">
          {vendor.data ? "Your vendor application is under review. We'll notify you within 24 hours." : "Register as a vendor to access the dashboard."}
        </p>
        {!vendor.data && <Button onClick={() => navigate("/vendor/register")} className="rounded-full">Register as Vendor</Button>}
      </div>
    );
  }

  const products = myProducts.data || [];
  const orders   = vendorOrders.data || [];

  const filteredProducts = products.filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.brand ?? "").toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.sku ?? "").toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredOrders = orderFilter === "all" ? orders : orders.filter(o => o.status === orderFilter);

  const totalRevenue  = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + parseFloat(o.totalAmount), 0);
  const pendingCount  = orders.filter(o => o.status === "pending").length;
  const activeCount   = products.filter(p => p.status === "active").length;

  const orderStatusCounts: Record<string, number> = {};
  for (const o of orders) orderStatusCounts[o.status] = (orderStatusCounts[o.status] ?? 0) + 1;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header bar ── */}
      <div className="zen-hero py-10">
        <div className="container flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Store className="h-4 w-4 text-white/60" />
              <span className="text-xs text-white/50 tracking-widest uppercase">Vendor Dashboard</span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] rounded-full ml-1">Approved</Badge>
            </div>
            <h1 className="text-2xl font-light tracking-wide text-white">{vendor.data.businessName}</h1>
            {vendor.data.rating && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span className="text-sm text-white/60">{Number(vendor.data.rating).toFixed(1)}</span>
              </div>
            )}
          </div>
          <Button onClick={openAdd} className="rounded-full text-white gap-2 self-start sm:self-auto" size="sm">
            <Plus className="h-4 w-4" /> List New Part
          </Button>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={<Package className="h-5 w-5" />}    label="Active Listings" value={activeCount}          sub={`${products.length} total`} />
          <StatCard icon={<ShoppingCart className="h-5 w-5" />} label="Total Orders"  value={orders.length}        sub={pendingCount > 0 ? `${pendingCount} need action` : "All caught up"} alert={pendingCount > 0} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Revenue"         value={formatGHS(totalRevenue)} sub="excl. cancelled" />
          <StatCard icon={<Eye className="h-5 w-5" />}        label="Rating"          value={vendor.data.rating ? `${Number(vendor.data.rating).toFixed(1)} ★` : "No reviews yet"} sub="buyer rating" />
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="products">
          <TabsList className="mb-6 bg-white/50 backdrop-blur-xl rounded-2xl">
            <TabsTrigger value="products" className="tracking-wide rounded-xl">
              Products <span className="ml-1.5 text-[10px] bg-foreground/10 rounded-full px-1.5 py-0.5">{products.length}</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="tracking-wide rounded-xl">
              Orders
              {pendingCount > 0 && <span className="ml-1.5 text-[10px] bg-primary text-white rounded-full px-1.5 py-0.5">{pendingCount}</span>}
            </TabsTrigger>
          </TabsList>

          {/* ════ Products tab ════ */}
          <TabsContent value="products" className="space-y-4">
            {/* search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              <Input
                placeholder="Search products…"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="pl-10 rounded-2xl border-border/30 bg-white/60 backdrop-blur-sm"
              />
            </div>

            {filteredProducts.length > 0 ? (
              <div className="space-y-2.5">
                {filteredProducts.map((product) => {
                  const imgs   = (product.images as string[] | null) ?? [];
                  const active = product.status === "active";
                  const isEditingQty = editingQtyId === product.id;
                  return (
                    <Card key={product.id} className={`zen-card rounded-2xl border-white/20 bg-white/50 backdrop-blur-xl shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] transition-opacity ${!active ? "opacity-60" : ""}`}>
                      <CardContent className="p-4 flex items-center gap-4">
                        {/* thumbnail */}
                        <div className="w-14 h-14 rounded-xl bg-muted/50 overflow-hidden flex-shrink-0">
                          {imgs[0] ? <img src={imgs[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground/20" /></div>}
                        </div>

                        {/* info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-sm tracking-wide truncate">{product.name}</h3>
                            {!active && <Badge variant="outline" className="text-[10px] rounded-full border-amber-300 text-amber-600">Paused</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-primary/90 font-medium text-sm">{formatGHS(product.price)}</span>
                            <Badge variant="secondary" className="text-[10px] rounded-full capitalize">{product.condition}</Badge>
                            {imgs.length > 0 && <span className="text-[11px] text-muted-foreground/50 flex items-center gap-0.5"><ImageIcon className="h-3 w-3" />{imgs.length}</span>}
                            {imgs.length === 0 && <Badge className="text-[10px] rounded-full bg-amber-500/10 text-amber-600 border-amber-200">⚠ No photos</Badge>}
                            {!product.vehicleMake && <Badge className="text-[10px] rounded-full bg-blue-500/10 text-blue-600 border-blue-200">No fitment</Badge>}
                            {(product.quantity ?? 0) <= 2 && (product.quantity ?? 0) > 0 && <Badge className="text-[10px] rounded-full bg-orange-500/10 text-orange-600 border-orange-200">Low stock</Badge>}
                            {/* inline qty edit */}
                            {isEditingQty ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  autoFocus
                                  type="number"
                                  value={editingQtyVal}
                                  onChange={e => setEditingQtyVal(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") saveInlineQty(product.id); if (e.key === "Escape") setEditingQtyId(null); }}
                                  className="w-16 h-6 text-xs rounded-lg border-border/40 px-2"
                                />
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs rounded-lg" onClick={() => saveInlineQty(product.id)}>Save</Button>
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs rounded-lg" onClick={() => setEditingQtyId(null)}>✕</Button>
                              </div>
                            ) : (
                              <button
                                className="text-[11px] text-muted-foreground underline-offset-2 hover:underline cursor-pointer"
                                onClick={() => { setEditingQtyId(product.id); setEditingQtyVal(String(product.quantity ?? 1)); }}
                              >
                                Qty: {product.quantity ?? 0}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* active/pause toggle */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl text-muted-foreground/60 hover:text-foreground"
                            title={active ? "Pause listing" : "Activate listing"}
                            onClick={() => toggleProductStatus(product)}
                          >
                            {active ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5" />}
                          </Button>
                          {/* edit */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl text-muted-foreground/60 hover:text-foreground"
                            onClick={() => openEdit(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {/* delete */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-xl text-destructive/50 hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{product.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently remove the listing and cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                <AlertDialogAction className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteProduct.mutate({ id: product.id })}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed border-white/20 rounded-3xl bg-white/30 backdrop-blur-xl">
                <CardContent className="py-16 text-center">
                  <Package className="h-10 w-10 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="font-medium tracking-wide mb-1">{productSearch ? "No products match your search" : "No products yet"}</p>
                  <p className="text-sm text-muted-foreground tracking-wide mb-6">{productSearch ? "Try a different keyword" : "List your first part and start selling."}</p>
                  {!productSearch && <Button onClick={openAdd} className="rounded-full text-white gap-2"><Plus className="h-4 w-4" />List First Part</Button>}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ════ Orders tab ════ */}
          <TabsContent value="orders" className="space-y-4">
            {/* status filter pills */}
            <div className="flex gap-2 flex-wrap">
              {ORDER_FILTERS.map(f => {
                const count = f === "all" ? orders.length : (orderStatusCounts[f] ?? 0);
                if (f !== "all" && count === 0) return null;
                return (
                  <button
                    key={f}
                    onClick={() => setOrderFilter(f)}
                    className={`text-xs rounded-full px-3 py-1.5 border transition-colors capitalize tracking-wide flex items-center gap-1.5
                      ${orderFilter === f ? "bg-foreground text-background border-foreground" : "bg-white/50 border-border/30 text-muted-foreground hover:border-foreground/30"}`}
                  >
                    {f === "all" ? "All" : f} {count > 0 && <span className={`text-[10px] font-medium ${orderFilter === f ? "text-background/70" : "text-muted-foreground"}`}>({count})</span>}
                  </button>
                );
              })}
            </div>

            {filteredOrders.length > 0 ? (
              <div className="space-y-3">
                {filteredOrders.map((order: any) => {
                  const cfg      = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
                  const expanded = expandedOrders.has(order.id);
                  const items    = order.items ?? [];
                  return (
                    <Card key={order.id} className="zen-card rounded-2xl border-white/20 bg-white/50 backdrop-blur-xl shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)]">
                      <CardContent className="p-5">
                        {/* order header */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-semibold tracking-wide">{order.orderNumber}</span>
                              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
                                {cfg.icon} {cfg.label}
                              </span>
                              {order.paymentStatus === "paid" && (
                                <span className="text-[11px] bg-emerald-500/10 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">Paid</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 tracking-wide">
                              {new Date(order.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base font-medium text-primary/90">{formatGHS(order.totalAmount)}</p>
                            <p className="text-[11px] text-muted-foreground capitalize">{order.paymentMethod?.replace(/_/g, " ")}</p>
                          </div>
                        </div>

                        {/* buyer info */}
                        {(order.buyerName || order.buyerPhone || order.shippingAddress) && (
                          <div className="bg-muted/40 rounded-xl p-3 mb-4 space-y-1.5">
                            {order.buyerName && (
                              <div className="flex items-center gap-2 text-sm">
                                <Store className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                                <span className="font-medium">{order.buyerName}</span>
                              </div>
                            )}
                            {order.buyerPhone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                                <a href={`tel:${order.buyerPhone}`} className="text-primary/80 hover:underline">{order.buyerPhone}</a>
                                <a
                                  href={`https://wa.me/${order.buyerPhone.replace(/\D/g, "")}?text=Hi! This is regarding your order ${order.orderNumber} on VOOM Ghana.`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full hover:bg-emerald-500/20 transition-colors"
                                >
                                  WhatsApp
                                </a>
                              </div>
                            )}
                            {order.shippingAddress && (
                              <div className="flex items-start gap-2 text-sm">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground text-xs">{order.shippingAddress}{order.shippingCity ? `, ${order.shippingCity}` : ""}{order.shippingRegion ? `, ${order.shippingRegion}` : ""}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* items accordion */}
                        {items.length > 0 && (
                          <div className="mb-4">
                            <button
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
                              onClick={() => toggleOrderExpand(order.id)}
                            >
                              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              {items.length} item{items.length !== 1 ? "s" : ""}
                            </button>
                            {expanded && (
                              <div className="space-y-1.5 border border-border/20 rounded-xl p-3 bg-background/40">
                                {items.map((item: any) => (
                                  <div key={item.id} className="flex items-center justify-between text-sm">
                                    <span className="text-foreground/80 truncate mr-4">{item.productName} <span className="text-muted-foreground">×{item.quantity}</span></span>
                                    <span className="text-foreground/70 flex-shrink-0">{formatGHS(item.totalPrice)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* action buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {order.status === "pending" && (
                            <>
                              <Button size="sm" className="rounded-full text-white gap-1.5" onClick={() => updateOrderStatus.mutate({ id: order.id, status: "confirmed" })}>
                                <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Order
                              </Button>
                              <Button size="sm" variant="ghost" className="rounded-full text-destructive/70" onClick={() => updateOrderStatus.mutate({ id: order.id, status: "cancelled" })}>
                                Cancel
                              </Button>
                            </>
                          )}
                          {order.status === "confirmed" && (
                            <Button size="sm" variant="outline" className="rounded-full border-border/30 gap-1.5" onClick={() => updateOrderStatus.mutate({ id: order.id, status: "processing" })}>
                              <RotateCcw className="h-3.5 w-3.5" /> Mark Processing
                            </Button>
                          )}
                          {order.status === "processing" && (
                            <Button size="sm" variant="outline" className="rounded-full border-border/30 gap-1.5" onClick={() => updateOrderStatus.mutate({ id: order.id, status: "shipped" })}>
                              <Truck className="h-3.5 w-3.5" /> Mark Shipped
                            </Button>
                          )}
                          {order.status === "shipped" && (
                            <Button size="sm" className="rounded-full text-white gap-1.5" onClick={() => updateOrderStatus.mutate({ id: order.id, status: "delivered" })}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Delivered
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed border-white/20 rounded-3xl bg-white/30 backdrop-blur-xl">
                <CardContent className="py-16 text-center">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="font-medium tracking-wide mb-1">{orderFilter !== "all" ? `No ${orderFilter} orders` : "No orders yet"}</p>
                  <p className="text-sm text-muted-foreground tracking-wide">
                    {orderFilter !== "all" ? "Try a different status filter." : "Orders will appear here when buyers purchase your products."}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}

// ── small layout helpers ──────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, alert }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; alert?: boolean }) {
  return (
    <Card className="zen-card rounded-2xl border-white/20 bg-white/50 backdrop-blur-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
      <CardContent className="p-5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${alert ? "bg-amber-500/15 text-amber-600" : "bg-primary/10 text-primary/80"}`}>
          {icon}
        </div>
        <p className="text-xl font-light tracking-wide">{value}</p>
        <p className="text-[11px] text-muted-foreground tracking-wide mt-0.5">{label}</p>
        {sub && <p className={`text-[10px] mt-1 tracking-wide ${alert ? "text-amber-500 font-medium" : "text-muted-foreground/60"}`}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

