// app/actions/cart.ts
'use server';

import { config } from '@/lib/config';

export async function getCartDetailsAction(cartId: string) {
  if (!cartId) return { success: false, items: [], totalQuantity: 0, prices: null };

  try {
    const query = `
      query GetCart($cartId: String!) {
        cart(cart_id: $cartId) {
          total_quantity
          items {
            id
            quantity
            product {
              name
              sku
              small_image {
                url
              }
            }
            prices {
              row_total {
                value
                currency
              }
            }
          }
          prices {
            grand_total {
              value
              currency
            }
          }
        }
      }
    `;

    const res = await fetch(config.magentoGraphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { cartId },
      }),
      cache: 'no-store',
    });

    const json = await res.json();
    if (json.errors) {
      return { success: false, error: json.errors[0].message };
    }

    return {
      success: true,
      items: json?.data?.cart?.items || [],
      totalQuantity: json?.data?.cart?.total_quantity || 0,
      grandTotal: json?.data?.cart?.prices?.grand_total || null,
    };
  } catch (err: any) {
    console.error('Fetch cart error:', err);
    return { success: false, error: err.message };
  }
}