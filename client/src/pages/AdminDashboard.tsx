import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { formatGHS } from "@shared/marketplace";
import {
  Users, Store, Package, ShoppingCart, TrendingUp,
  CheckCircle, XCircle, Clock, Loader2, LayoutDashboard, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const stats = trpc.admin.stats.useQuery(undefined, { enabled: user?.role === "admin" });
  const vendors = trpc.admin.vendors.useQuery(undefined, { enabled: user?.role === "admin" });
  const orders = trpc.admin.orders.useQuery(undefined, { enabled: user?.role === "admin" });
  const utils = trpc.useUtils();
  const seedCategories = trpc.admin.seedCategories.useMutation({
    onSuccess: (data) => toast.success(`Seeded ${data.count} categories!`),
    onError: (err) => toast.error(err.message),
  });
  const updateVendorStatus = trpc.admin.updateVendorStatus.useMutation({
    onSuccess: () => { utils.admin.vendors.invalidate(); utils.admin.stats.invalidate(); toast.success("Vendor status updated"); },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/80" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="container py-24 text-center">
        <LayoutDashboard className="h-12 w-12 mx-auto mb-6 text-muted-foreground/30" />
        <h2 className="text-xl font-light tracking-wide mb-3">Admin Access Required</h2>
        <p className="text-muted-foreground text-sm tracking-wide">You need admin privileges to access this page.</p>
      </div>
    );
  }

  const s = stats.data || { totalUsers: 0, totalVendors: 0, totalProducts: 0, totalOrders: 0, totalRevenue: "0", pendingVendors: 0 };

  return (
    <div className="min-h-screen bg-background">
      <div className="zen-hero py-12">
        <div className="container flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-wide text-white">Admin Dashboard</h1>
            <p className="text-white/50 mt-2 tracking-wide">Marketplace overview and management</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/10 rounded-full"
            onClick={() => seedCategories.mutate()}
            disabled={seedCategories.isPending}
          >
            <Sparkles className="h-4 w-4 mr-1" /> Seed Categories
          </Button>
        </div>
      </div>

      <div className="container py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 mb-8">
          <StatCard icon={<Users className="h-5 w-5" />} label="Users" value={s.totalUsers} />
          <StatCard icon={<Store className="h-5 w-5" />} label="Vendors" value={s.totalVendors} />
          <StatCard icon={<Clock className="h-5 w-5" />} label="Pending" value={s.pendingVendors} highlight />
          <StatCard icon={<Package className="h-5 w-5" />} label="Products" value={s.totalProducts} />
          <StatCard icon={<ShoppingCart className="h-5 w-5" />} label="Orders" value={s.totalOrders} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Revenue" value={formatGHS(s.totalRevenue)} />
        </div>

        <Tabs defaultValue="vendors">
          <TabsList className="mb-6 bg-white/50 backdrop-blur-xl rounded-2xl">
            <TabsTrigger value="vendors" className="tracking-wide rounded-xl">Vendors ({vendors.data?.length || 0})</TabsTrigger>
            <TabsTrigger value="orders" className="tracking-wide rounded-xl">Orders ({orders.data?.length || 0})</TabsTrigger>
          </TabsList>

          {/* Vendors Tab */}
          <TabsContent value="vendors">
            {vendors.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary/80" />
              </div>
            ) : (vendors.data?.length || 0) > 0 ? (
              <div className="space-y-3">
                {vendors.data?.map((v) => (
                  <Card key={v.id} className="zen-card rounded-2xl border-white/20 bg-white/50 backdrop-blur-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Store className="h-5 w-5 text-primary/90" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium tracking-wide text-sm">{v.businessName}</h3>
                        <p className="text-xs text-muted-foreground tracking-wide">
                          {v.city}, {v.region} &bull; {v.phone}
                        </p>
                      </div>
                      <Badge
                        variant={v.status === "approved" ? "default" : v.status === "pending" ? "secondary" : "destructive"}
                        className="capitalize rounded-full"
                      >
                        {v.status}
                      </Badge>
                      {v.status === "pending" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-8 text-white rounded-full"
                            onClick={() => updateVendorStatus.mutate({ id: v.id, status: "approved" })}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-destructive/70 rounded-full"
                            onClick={() => updateVendorStatus.mutate({ id: v.id, status: "rejected" })}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                      {v.status === "approved" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-destructive/70 rounded-full"
                          onClick={() => updateVendorStatus.mutate({ id: v.id, status: "suspended" })}
                        >
                          Suspend
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-white/20 rounded-3xl bg-white/30 backdrop-blur-xl">
                <CardContent className="py-16 text-center">
                  <p className="text-muted-foreground tracking-wide">No vendors registered yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            {orders.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary/80" />
              </div>
            ) : (orders.data?.length || 0) > 0 ? (
              <div className="space-y-3">
                {orders.data?.map((order) => (
                  <Card key={order.id} className="zen-card rounded-2xl border-white/20 bg-white/50 backdrop-blur-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm font-medium tracking-wide">{order.orderNumber}</span>
                        <span className="text-xs text-muted-foreground ml-2 tracking-wide">
                          {new Date(order.createdAt).toLocaleDateString("en-GH")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-primary/90 font-medium tracking-wide">{formatGHS(order.totalAmount)}</span>
                        <Badge variant="secondary" className="capitalize rounded-full">{order.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-white/20 rounded-3xl bg-white/30 backdrop-blur-xl">
                <CardContent className="py-16 text-center">
                  <p className="text-muted-foreground tracking-wide">No orders yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string | number; highlight?: boolean }) {
  return (
    <Card className={`zen-card rounded-2xl border-white/20 bg-white/50 backdrop-blur-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] ${highlight && Number(value) > 0 ? "border-primary/20 bg-primary/5" : ""}`}>
      <CardContent className="p-5 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${highlight && Number(value) > 0 ? "bg-primary/15 text-primary/90" : "bg-primary/10 text-primary/90"}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground tracking-wide">{label}</p>
          <p className="text-lg font-light tracking-[0.03em]">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
