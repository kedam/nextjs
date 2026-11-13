// app/components/CartInitializer.tsx
'use client';

import { useEffect } from 'react';
import { config } from '@/lib/config';

export default function CartInitializer() {
  useEffect(() => {
    const initializeCart = async () => {
      try {
        const existingCartId = localStorage.getItem('magento_cart_id');
        if (existingCartId) return; // Cart already exists, do nothing

        const res = await fetch(config.magentoGraphqlUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'mutation { createEmptyCart }' }),
        });

        const json = await res.json();
        const cartId = json?.data?.createEmptyCart;

        if (cartId) {
          localStorage.setItem('magento_cart_id', cartId);
          console.log('Magento guest cart initialized successfully:', cartId);
        }
      } catch (err) {
        console.error('Failed to initialize empty cart on load:', err);
      }
    };

    initializeCart();
  }, [],);

  return null; // Invisible utility component
}