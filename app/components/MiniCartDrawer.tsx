// app/components/MiniCartDrawer.tsx (Checkout Button update)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // 1. Import useRouter
import { getCartDetailsAction } from '@/app/actions/cart';

export default function MiniCartDrawer() {
  const router = useRouter(); // 2. Initialize router
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [grandTotal, setGrandTotal] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    const cartId = localStorage.getItem('magento_cart_id');
    if (!cartId) return;

    setLoading(true);
    const res = await getCartDetailsAction(cartId);
    if (res.success) {
      setItems(res.items);
      setTotalQuantity(res.totalQuantity);
      setGrandTotal(res.grandTotal);
    } else if (res.error?.includes('NoSuchEntity')) {
      localStorage.removeItem('magento_cart_id');
      setItems([]);
      setTotalQuantity(0);
      setGrandTotal(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCart();
    window.addEventListener('cartUpdated', fetchCart);
    return () => window.removeEventListener('cartUpdated', fetchCart);
  }, []);

  return (
    <div className="relative z-50">
      <button
        onClick={() => {
          fetchCart();
          setIsOpen(true);
        }}
        className="fixed top-6 right-6 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg transition flex items-center gap-2 cursor-pointer"
      >
        <span>🛒 Cart</span>
        {totalQuantity > 0 && (
          <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
            {totalQuantity}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex justify-end backdrop-blur-xs transition">
          <div className="w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                <h2 className="text-xl font-bold text-white">Your Shopping Cart</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-zinc-400 hover:text-white text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {loading && items.length === 0 ? (
                <p className="text-zinc-400 text-center py-12">Loading cart items...</p>
              ) : items.length === 0 ? (
                <div className="text-center py-16 text-zinc-400">
                  <p className="text-lg mb-2">Your cart is empty</p>
                  <p className="text-xs">Add products from the catalog to get started.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between gap-4"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-white line-clamp-1">
                          {item.product.name}
                        </h4>
                        <p className="text-xs text-zinc-400">SKU: {item.product.sku}</p>
                        <p className="text-xs font-medium text-emerald-400 mt-1">
                          Qty: {item.quantity} × {item.prices.row_total.value}{' '}
                          {item.prices.row_total.currency}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-zinc-800 pt-4 mt-4">
                <div className="flex justify-between items-center mb-4 text-lg font-bold">
                  <span className="text-zinc-300">Grand Total:</span>
                  <span className="text-emerald-400">
                    {grandTotal?.value} {grandTotal?.currency}
                  </span>
                </div>
                {/* 3. Navigate to checkout on click */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/checkout');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition shadow-lg cursor-pointer text-center"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}