import { useState, useEffect, useCallback } from "react";

export interface GuestCartItem {
  localId: string;
  productId: number;
  productName: string;
  price: string;
  quantity: number;
  vendorId: number;
  vendorWhatsapp?: string;
  vendorName?: string;
  image?: string;
}

const STORAGE_KEY = "voom_guest_cart";

function readStorage(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage(items: GuestCartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useGuestCart() {
  const [items, setItems] = useState<GuestCartItem[]>(() => readStorage());

  useEffect(() => {
    const handler = () => setItems(readStorage());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const sync = useCallback((next: GuestCartItem[]) => {
    writeStorage(next);
    setItems(next);
  }, []);

  const addItem = useCallback((item: Omit<GuestCartItem, "localId">) => {
    const current = readStorage();
    const existing = current.find(i => i.productId === item.productId);
    if (existing) {
      sync(current.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i));
    } else {
      sync([...current, { ...item, localId: `${item.productId}-${Date.now()}` }]);
    }
  }, [sync]);

  const updateItem = useCallback((localId: string, quantity: number) => {
    if (quantity <= 0) {
      sync(readStorage().filter(i => i.localId !== localId));
    } else {
      sync(readStorage().map(i => i.localId === localId ? { ...i, quantity } : i));
    }
  }, [sync]);

  const removeItem = useCallback((localId: string) => {
    sync(readStorage().filter(i => i.localId !== localId));
  }, [sync]);

  const clearCart = useCallback(() => sync([]), [sync]);

  const total = items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, total, count, addItem, updateItem, removeItem, clearCart };
}
