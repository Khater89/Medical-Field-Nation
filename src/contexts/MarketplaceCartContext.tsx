import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export interface CartItem {
  product_id: string;
  vendor_id: string;
  name: string;
  price: number;
  cover_image_url?: string | null;
  quantity: number;
  unit?: string | null;
  requires_prescription?: boolean;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  updateQty: (product_id: string, qty: number) => void;
  removeItem: (product_id: string) => void;
  clear: () => void;
  clearVendor: (vendor_id: string) => void;
  count: number;
  subtotal: number;
  vendorsCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "mfn_marketplace_cart";

export function MarketplaceCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem: CartContextValue["addItem"] = (item, qty = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.product_id === item.product_id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + qty };
        return copy;
      }
      return [...prev, { ...item, quantity: qty }];
    });
  };

  const updateQty = (product_id: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((p) => p.product_id !== product_id)
        : prev.map((p) => (p.product_id === product_id ? { ...p, quantity: qty } : p))
    );
  };

  const removeItem = (product_id: string) =>
    setItems((prev) => prev.filter((p) => p.product_id !== product_id));
  const clear = () => setItems([]);
  const clearVendor = (vendor_id: string) =>
    setItems((prev) => prev.filter((p) => p.vendor_id !== vendor_id));

  const { count, subtotal, vendorsCount } = useMemo(() => {
    const c = items.reduce((s, i) => s + i.quantity, 0);
    const sub = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const v = new Set(items.map((i) => i.vendor_id)).size;
    return { count: c, subtotal: sub, vendorsCount: v };
  }, [items]);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQty, removeItem, clear, clearVendor, count, subtotal, vendorsCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within MarketplaceCartProvider");
  return ctx;
};
