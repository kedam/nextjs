// app/api/cart/route.ts
import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function POST(request: Request) {
  try {
    const { sku, cartId } = await request.json();
    let activeCartId = cartId;

    // 1. Create an empty cart if none exists
    if (!activeCartId) {
      const createCartRes = await fetch(config.magentoGraphqlUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Store': 'default', // Helpful header for Magento multi-store context
        },
        body: JSON.stringify({ query: 'mutation { createEmptyCart }' }),
      });

      const responseText = await createCartRes.text();
      console.log('Magento createEmptyCart raw response:', responseText);

      if (!responseText || responseText.trim() === '') {
        return NextResponse.json({ success: false, error: 'Magento returned an empty response when creating cart.' }, { status: 502 });
      }

      const createCartJson = JSON.parse(responseText);

      // Check if Magento returned GraphQL errors
      if (createCartJson.errors) {
        console.error('Magento GraphQL Errors on createEmptyCart:', createCartJson.errors);
        return NextResponse.json({ 
          success: false, 
          error: createCartJson.errors[0]?.message || 'Magento cart creation failed.' 
        }, { status: 400 });
      }

      activeCartId = createCartJson?.data?.createEmptyCart;

      if (!activeCartId) {
        return NextResponse.json({ success: false, error: 'Could not retrieve cart ID from Magento response.' }, { status: 400 });
      }
    }

    // 2. Add product to the cart
    const addQuery = `
      mutation AddProductsToCart($cartId: String!, $sku: String!) {
        addProductsToCart(
          cartId: $cartId
          cartItems: [{ data: { sku: $sku, quantity: 1 } }]
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

    const addRes = await fetch(config.magentoGraphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: addQuery,
        variables: { cartId: activeCartId, sku },
      }),
    });

    const addResponseText = await addRes.text();
    const addJson = JSON.parse(addResponseText);

    if (addJson.errors) {
      console.error('Magento GraphQL Errors on addProductsToCart:', addJson.errors);
      return NextResponse.json({ success: false, error: addJson.errors[0].message }, { status: 400 });
    }

    return NextResponse.json({ success: true, cartId: activeCartId });
  } catch (err: any) {
    console.error('API cart route catch error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}