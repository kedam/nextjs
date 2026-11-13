// app/components/MiniCartDrawer.tsx
'use client';

import { useState, useEffect } from 'react';
import { getCartDetailsAction } from '@/app/actions/cart';

interface CartItem {
  id: string;
  quantity: number;
  product: {
    name: string;
    sku: string;
    small_image?: {
      url: string;
    };
  };
  prices: {
    row_total: {
      value: number;
      currency: string;
    };
  };
}

export default function MiniCartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [grandTotal, setGrandTotal] = useState<{ value: number; currency: string } | null>(null);

  const fetchCart = async () => {
    const cartId = localStorage.getItem('magento_cart_id');
    if (!cartId) return;

    setLoading(true);
    const res = await getCartDetailsAction(cartId);
    if (res.success) {
      setItems(res.items);
      setTotalQuantity(res.totalQuantity);
      setGrandTotal(res.grandTotal);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCart();
    // Optional custom event listener so other components can trigger cart refreshes
    window.addEventListener('cartUpdated', fetchCart);
    return () => window.removeEventListener('cartUpdated', fetchCart);
  }, []);

 
}