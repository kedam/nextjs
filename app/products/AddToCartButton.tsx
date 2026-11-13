// app/products/AddToCartButton.tsx
'use client';

import { useState } from 'react';

interface AddToCartButtonProps {
  sku: string;
  productName: string;
}

export default function AddToCartButton({ sku, productName }: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleAddToCart = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Retrieve and sanitize cartId from localStorage (allow null if empty)
      const rawCartId = localStorage.getItem('magento_cart_id');
      const cartId =
        !rawCartId || rawCartId === 'null' || rawCartId === 'undefined' ? null : rawCartId;

      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, cartId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // If cart ID was stale, clear storage and retry once with a fresh cart
        if (cartId) {
          localStorage.removeItem('magento_cart_id');
          const retryRes = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku, cartId: null }),
          });
          const retryData = await retryRes.json();

          if (retryData.success && retryData.cartId) {
            localStorage.setItem('magento_cart_id', retryData.cartId);
            setMessage('Added to cart!');
            window.dispatchEvent(new Event('cartUpdated'));
            setTimeout(() => setMessage(null), 2500);
            return;
          }
          throw new Error(retryData.error || 'Failed to add product to cart.');
        }
        throw new Error(data.error || 'Failed to add product to cart.');
      }

      if (data.cartId) {
        localStorage.setItem('magento_cart_id', data.cartId);
      }

      setMessage('Added to cart!');
      window.dispatchEvent(new Event('cartUpdated'));
      setTimeout(() => setMessage(null), 2500);
    } catch (err: any) {
      console.error('Add to cart error:', err);
      setMessage(err.message || 'Error adding to cart');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handleAddToCart}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl transition duration-200 shadow-md cursor-pointer text-sm flex items-center justify-center gap-2"
      >
        {loading ? 'Adding...' : 'Add to Cart'}
      </button>
      {message && (
        <p
          className={`text-xs text-center font-medium ${
            message.includes('Added') ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}