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

async function addConfigurableToCart(
  graphqlUrl: string,
  cartId: string,
  parentSku: string,
  childSku: string
) {
  const mutation = `
    mutation AddConfigurableProductsToCart(
      $cartId: String!
      $parentSku: String!
      $childSku: String!
    ) {
      addConfigurableProductsToCart(
        input: {
          cart_id: $cartId
          cart_items: [
            {
              parent_sku: $parentSku
              data: {
                sku: $childSku
                quantity: 1
              }
            }
          ]
        }
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
      }
    }
  `;

  const res = await fetch(graphqlUrl, {
    method: 'POST',
    headers: MAGENTO_HEADERS,
    body: JSON.stringify({
      query: mutation,
      variables: {
        cartId,
        parentSku,
        childSku,
      },
    }),
  });

  return await res.json();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { parentSku, childSku, cartId } = body;

    if (!parentSku || !childSku) {
      return NextResponse.json({ success: false, error: 'Parent SKU and Child SKU are required' }, { status: 400 });
    }

    if (!cartId || cartId === 'null' || cartId === 'undefined') {
      cartId = await createCart(config.magentoGraphqlUrl);
    }

    if (!cartId) {
      return NextResponse.json({ success: false, error: 'Could not create cart ID.' }, { status: 400 });
    }

    let addResponse = await addConfigurableToCart(
      config.magentoGraphqlUrl,
      cartId,
      parentSku,
      childSku
    );

    if (
      addResponse.errors &&
      addResponse.errors.some(
        (e: any) =>
          e.message.includes('NoSuchEntity') ||
          e.message.includes('cart') ||
          e.message.includes('ID')
      )
    ) {
      const newCartId = await createCart(config.magentoGraphqlUrl);
      if (newCartId) {
        cartId = newCartId;
        addResponse = await addConfigurableToCart(
          config.magentoGraphqlUrl,
          cartId,
          parentSku,
          childSku
        );
      }
    }

    if (addResponse.errors) {
      return NextResponse.json({ success: false, error: addResponse.errors[0].message }, { status: 400 });
    }

    const cartData = addResponse?.data?.addConfigurableProductsToCart?.cart;

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