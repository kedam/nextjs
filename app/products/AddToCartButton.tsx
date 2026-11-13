// app/products/AddToCartButton.tsx
'use client';

import { useState } from 'react';

interface AddToCartButtonProps {
  sku: string;
  productName: string;
}

export default function AddToCartButton({ sku, productName }: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAddToCart = async () => {
    setLoading(true);
    setMessage('');

    try {
      // 1. Get or create guest cart ID from localStorage
      let cartId = localStorage.getItem('magento_cart_id');

      if (!cartId) {
        const createCartRes = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'mutation { createEmptyCart }' }),
        });
        const createCartJson = await createCartRes.json();
        cartId = createCartJson?.data?.createEmptyCart;

        if (cartId) {
          localStorage.setItem('magento_cart_id', cartId);
        }
      }

      if (!cartId) throw new Error('Could not create or retrieve cart ID.');

      // 2. Add product to cart via local API proxy
      const addQuery = `
        mutation AddProductsToCart($cartId: String!, $sku: String!) {
          addProductsToCart(
            cartId: $cartId
            cartItems: [{ sku: $sku, quantity: 1 }]
          ) {
            cart {
              items {
                product {
                  name
                }
                quantity
              }
            }
          }
        }
      `;

      const addRes = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: addQuery,
          variables: { cartId, sku },
        }),
      });

      const addJson = await addRes.json();

      if (addJson.errors) {
        throw new Error(addJson.errors[0].message);
      }

      setMessage('Added successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error('Add to cart error:', err);
      setMessage('Failed to add.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleAddToCart}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium py-2 px-4 rounded-lg transition duration-200 shadow-md text-sm cursor-pointer"
      >
        {loading ? 'Adding...' : 'Add to Cart'}
      </button>
      {message && <p className="text-xs text-emerald-400 text-center font-medium">{message}</p>}
    </div>
  );
}