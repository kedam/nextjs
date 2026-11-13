// app/api/cart/route.ts
import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

const MAGENTO_HEADERS = {
  'Content-Type': 'application/json',
  'Store': 'default',
};

async function createCart(graphqlUrl: string): Promise<string | null> {
  const res = await fetch(graphqlUrl, {
    method: 'POST',
    headers: MAGENTO_HEADERS,
    body: JSON.stringify({ query: 'mutation { createEmptyCart }' }),
  });
  const json = await res.json();
  return json?.data?.createEmptyCart || null;
}

async function addProductToCart(graphqlUrl: string, cartId: string, sku: string) {
  const mutation = `
    mutation AddProductsToCart($cartId: String!, $sku: String!) {
      addProductsToCart(
        cartId: $cartId
        cartItems: [{ sku: $sku, quantity: 1 }]
      ) {
        cart {
          total_quantity
          items {
            id
            quantity
            product { name sku }
          }
          prices {
            grand_total { value currency }
          }
        }
        user_errors {
          code
          message
        }
      }
    }
  `;
  const res = await fetch(graphqlUrl, {
    method: 'POST',
    headers: MAGENTO_HEADERS,
    body: JSON.stringify({ query: mutation, variables: { cartId, sku } }),
  });
  return await res.json();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { sku, cartId } = body;

    if (!sku) {
      return NextResponse.json({ success: false, error: 'SKU is missing' }, { status: 400 });
    }

    if (!cartId || cartId === 'null' || cartId === 'undefined') {
      cartId = await createCart(config.magentoGraphqlUrl);
    }

    if (!cartId) {
      return NextResponse.json({ success: false, error: 'Could not create cart ID.' }, { status: 400 });
    }

    let addResponse = await addProductToCart(config.magentoGraphqlUrl, cartId, sku);

    if (addResponse.errors) {
      return NextResponse.json({ success: false, error: addResponse.errors[0].message }, { status: 400 });
    }

    const result = addResponse?.data?.addProductsToCart;

    if (result?.user_errors && result.user_errors.length > 0) {
      const errorMessage = result.user_errors[0].message;
      if (errorMessage.includes('options')) {
        return NextResponse.json(
          { success: false, error: 'This is a configurable product. Please select size/color options or use a simple product SKU.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
    }

    const cartData = result?.cart;

    return NextResponse.json({
      success: true,
      cartId,
      totalQuantity: cartData?.total_quantity || 0,
      items: cartData?.items || [],
      grandTotal: cartData?.prices?.grand_total || null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}