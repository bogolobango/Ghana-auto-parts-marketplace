import { createContext, useContext } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

interface WishlistContextValue {
  wishlistedIds: Set<number>;
  toggle: (productId: number) => void;
}

const WishlistContext = createContext<WishlistContextValue>({
  wishlistedIds: new Set(),
  toggle: () => {},
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const wishlistIds = trpc.wishlist.productIds.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const toggleMutation = trpc.wishlist.toggle.useMutation({
    onSuccess: (data) => {
      utils.wishlist.productIds.invalidate();
      utils.wishlist.list.invalidate();
      toast.success(data.wishlisted ? "Saved to wishlist" : "Removed from wishlist");
    },
  });

  return (
    <WishlistContext.Provider
      value={{
        wishlistedIds: new Set(wishlistIds.data ?? []),
        toggle: (productId) => {
          if (!isAuthenticated) {
            toast.error("Sign in to save items to your wishlist");
            return;
          }
          toggleMutation.mutate({ productId });
        },
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
