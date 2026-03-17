import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { formatGHS } from "@shared/marketplace";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function Cart() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const cart = trpc.cart.list.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();

  const updateItem = trpc.cart.update.useMutation({
    onSuccess: () => utils.cart.list.invalidate(),
  });
  const removeItem = trpc.cart.remove.useMutation({
    onSuccess: () => { utils.cart.list.invalidate(); toast.success("Item removed"); },
  });
  const clearCart = trpc.cart.clear.useMutation({
    onSuccess: () => { utils.cart.list.invalidate(); toast.success("Cart cleared"); },
  });

  if (!isAuthenticated) {
    return (
      <div className="container py-24 text-center">
        <ShoppingCart className="h-12 w-12 mx-auto mb-6 text-muted-foreground/30" />
        <h2 className="text-xl font-light tracking-wide mb-3">Sign in to view your cart</h2>
        <p className="text-muted-foreground/70 text-sm tracking-wide">You need to be signed in to manage your shopping cart.</p>
      </div>
    );
  }

  if (cart.isLoading) {
    return (
      <div className="min-h-screen bg-background/50">
        <div className="container py-10 max-w-4xl">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-3xl backdrop-blur-xl bg-white/60 border border-white/40 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] p-4">
                  <div className="flex gap-4 items-start">
                    <Skeleton className="w-20 h-20 rounded-2xl flex-shrink-0" />
                    <div className="flex-1 space-y-2 min-w-0">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-xl flex-shrink-0" />
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/30">
                    <Skeleton className="h-5 w-24" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-9 w-9 rounded-2xl" />
                      <Skeleton className="h-4 w-6" />
                      <Skeleton className="h-9 w-9 rounded-2xl" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <Skeleton className="h-64 w-full rounded-3xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cart.error) {
    return (
      <div className="container py-24 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-6 text-destructive/60" />
        <h2 className="text-xl font-light tracking-wide mb-3">Failed to load cart</h2>
        <p className="text-muted-foreground/70 text-sm tracking-wide mb-8">{cart.error.message}</p>
        <Button className="rounded-full px-8" onClick={() => cart.refetch()}>Try Again</Button>
      </div>
    );
  }

  const items = cart.data || [];
  const total = items.reduce((sum, item) => {
    const price = item.product ? parseFloat(item.product.price) : 0;
    return sum + price * item.quantity;
  }, 0);

  if (items.length === 0) {
    return (
      <div className="container py-24 text-center">
        <ShoppingCart className="h-12 w-12 mx-auto mb-6 text-muted-foreground/30" />
        <h2 className="text-xl font-light tracking-wide mb-3">Your cart is empty</h2>
        <p className="text-muted-foreground/70 text-sm tracking-wide mb-8">Browse our marketplace to find the parts you need.</p>
        <Link href="/products"><Button className="rounded-full px-8">Browse Parts</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background/80 to-background/60">
      <div className="container py-10 max-w-4xl">
        <h1 className="text-2xl font-light tracking-wide mb-8 text-foreground">
          Shopping Cart
          <span className="ml-2 text-lg text-muted-foreground/60 font-normal">({items.length} {items.length === 1 ? "item" : "items"})</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Cart Items ── */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => {
              const product = item.product;
              if (!product) return null;
              const images = (product.images as string[] | null) || [];
              const isBusy = updateItem.isPending || removeItem.isPending;

              return (
                <div
                  key={item.id}
                  className="rounded-3xl backdrop-blur-xl bg-white/70 dark:bg-white/10 border border-white/50 dark:border-white/20 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.10)] overflow-hidden"
                  data-testid={`cart-item-${item.id}`}
                >
                  {/* Top row: image + name + delete */}
                  <div className="flex gap-4 items-start p-4 pb-3">
                    {/* Image */}
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-white/40 backdrop-blur-sm border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                      {images[0] ? (
                        <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/25" />
                        </div>
                      )}
                    </div>

                    {/* Name + vehicle */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <Link
                        href={`/products/${product.id}`}
                        className="font-medium tracking-wide text-sm text-foreground hover:text-primary/80 no-underline leading-snug block"
                        data-testid={`link-cart-product-${product.id}`}
                      >
                        {product.name}
                      </Link>
                      {product.vehicleMake && (
                        <p className="text-[11px] text-muted-foreground/60 tracking-wide mt-1">
                          {product.vehicleMake}{product.vehicleModel ? ` ${product.vehicleModel}` : ""}
                        </p>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground/40 hover:text-destructive/80 hover:bg-destructive/8 transition-colors"
                      onClick={() => removeItem.mutate({ id: item.id })}
                      disabled={isBusy}
                      aria-label="Remove item"
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Bottom row: price + quantity stepper */}
                  <div className="flex items-center justify-between px-4 pb-4 pt-2 border-t border-white/40">
                    {/* Price */}
                    <span className="text-base font-semibold text-primary tracking-wide" data-testid={`text-price-${item.id}`}>
                      {formatGHS(parseFloat(product.price) * item.quantity)}
                      {item.quantity > 1 && (
                        <span className="text-[10px] text-muted-foreground/50 font-normal ml-1.5 tracking-wide">
                          {formatGHS(product.price)} each
                        </span>
                      )}
                    </span>

                    {/* Quantity stepper */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={item.quantity <= 1 || isBusy}
                        onClick={() => updateItem.mutate({ id: item.id, quantity: item.quantity - 1 })}
                        aria-label="Decrease quantity"
                        data-testid={`button-qty-minus-${item.id}`}
                        className="w-9 h-9 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-white/60 dark:bg-white/15 border border-white/50 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] text-foreground/80 hover:bg-white/80 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span
                        className="text-sm font-semibold tracking-wide w-6 text-center text-foreground"
                        data-testid={`text-qty-${item.id}`}
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => updateItem.mutate({ id: item.id, quantity: item.quantity + 1 })}
                        aria-label="Increase quantity"
                        data-testid={`button-qty-plus-${item.id}`}
                        className="w-9 h-9 rounded-2xl flex items-center justify-center backdrop-blur-sm bg-white/60 dark:bg-white/15 border border-white/50 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] text-foreground/80 hover:bg-white/80 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Clear cart */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="text-xs text-muted-foreground/50 hover:text-destructive/70 tracking-wide transition-colors py-1"
                  data-testid="button-clear-cart"
                >
                  Clear Cart
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear your cart?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all {items.length} items. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">Keep Items</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full"
                    onClick={() => clearCart.mutate()}
                  >
                    Clear Cart
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* ── Order Summary ── */}
          <div>
            <div className="sticky top-20 rounded-3xl backdrop-blur-xl bg-white/75 dark:bg-white/10 border border-white/50 dark:border-white/20 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.12)] overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h2 className="text-base font-semibold tracking-wide text-foreground">Order Summary</h2>
              </div>

              <div className="px-5 pb-5 space-y-4">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm gap-3">
                      <span className="text-muted-foreground/70 tracking-wide truncate min-w-0" title={`${item.product?.name} ×${item.quantity}`}>
                        {item.product?.name}
                        {item.quantity > 1 && <span className="text-muted-foreground/45"> ×{item.quantity}</span>}
                      </span>
                      <span className="font-medium tracking-wide flex-shrink-0 text-foreground">
                        {formatGHS(parseFloat(item.product?.price || "0") * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-white/40 border-t border-black/8" />

                <div className="flex justify-between font-semibold tracking-wide text-lg">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">{formatGHS(total)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/checkout")}
                  data-testid="button-checkout"
                  className="w-full h-12 rounded-full bg-primary text-white font-medium tracking-wide text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)]"
                >
                  Proceed to Checkout <ArrowRight className="h-4 w-4" />
                </button>

                <p className="text-[11px] text-center text-muted-foreground/50 tracking-wide leading-relaxed">
                  Orders are confirmed via WhatsApp with the vendor
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
