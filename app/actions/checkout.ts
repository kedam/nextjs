// app/actions/checkout.ts
'use server';

import { config } from '@/lib/config';

const MAGENTO_HEADERS = {
  'Content-Type': 'application/json',
  'Store': 'default',
};

export async function processCheckoutAction(formData: {
  cartId: string;
  email: string;
  firstname: string;
  lastname: string;
  street: string;
  city: string;
  region: string;
  postcode: string;
  telephone: string;
  countryCode?: string;
}) {
  const { cartId, email, firstname, lastname, street, city, region, postcode, telephone, countryCode = 'US' } = formData;

  if (!cartId) {
    return { success: false, error: 'Cart ID is missing.' };
  }

  try {
    // Step 1: Set Guest Email
    const emailRes = await fetch(config.magentoGraphqlUrl, {
      method: 'POST',
      headers: MAGENTO_HEADERS,
      body: JSON.stringify({
        query: `
          mutation SetEmail($cartId: String!, $email: String!) {
            setGuestEmailOnCart(input: { cart_id: $cartId, email: $email }) {
              cart { email }
            }
          }
        `,
        variables: { cartId, email },
      }),
    });
    const emailJson = await emailRes.json();
    if (emailJson.errors) throw new Error(emailJson.errors[0].message);

    // Step 2: Set Shipping Address & retrieve available shipping methods
    const addressRes = await fetch(config.magentoGraphqlUrl, {
      method: 'POST',
      headers: MAGENTO_HEADERS,
      body: JSON.stringify({
        query: `
          mutation SetShipping(
            $cartId: String!
            $firstname: String!
            $lastname: String!
            $street: String!
            $city: String!
            $region: String!
            $postcode: String!
            $telephone: String!
            $countryCode: String!
          ) {
            setShippingAddressesOnCart(
              input: {
                cart_id: $cartId
                shipping_addresses: [
                  {
                    address: {
                      firstname: $firstname
                      lastname: $lastname
                      street: [$street]
                      city: $city
                      region: $region
                      postcode: $postcode
                      telephone: $telephone
                      country_code: $countryCode
                      save_in_address_book: false
                    }
                  }
                ]
              }
            ) {
              cart {
                shipping_addresses {
                  available_shipping_methods {
                    carrier_code
                    method_code
                  }
                }
              }
            }
          }
        `,
        variables: { cartId, firstname, lastname, street, city, region, postcode, telephone, countryCode },
      }),
    });
    const addressJson = await addressRes.json();
    if (addressJson.errors) throw new Error(addressJson.errors[0].message);

    const shippingAddresses = addressJson?.data?.setShippingAddressesOnCart?.cart?.shipping_addresses;
    const availableMethods = shippingAddresses?.[0]?.available_shipping_methods;

    if (!availableMethods || availableMethods.length === 0) {
      throw new Error('No shipping methods available for this address. Please check your Magento shipping configuration (Flat Rate / Free Shipping).');
    }

    const carrierCode = availableMethods[0].carrier_code;
    const methodCode = availableMethods[0].method_code;

    // Step 3: Set Shipping Method (Requesting minimal cart id response to avoid schema mismatches)
    const shippingMethodRes = await fetch(config.magentoGraphqlUrl, {
      method: 'POST',
      headers: MAGENTO_HEADERS,
      body: JSON.stringify({
        query: `
          mutation SetShippingMethod($cartId: String!, $carrierCode: String!, $methodCode: String!) {
            setShippingMethodsOnCart(
              input: {
                cart_id: $cartId
                shipping_methods: [{ carrier_code: $carrierCode, method_code: $methodCode }]
              }
            ) {
              cart { id }
            }
          }
        `,
        variables: { cartId, carrierCode, methodCode },
      }),
    });
    const shippingMethodJson = await shippingMethodRes.json();
    if (shippingMethodJson.errors) throw new Error(shippingMethodJson.errors[0].message);

    // Step 4: Set Payment Method (Checkmo)
    const paymentRes = await fetch(config.magentoGraphqlUrl, {
      method: 'POST',
      headers: MAGENTO_HEADERS,
      body: JSON.stringify({
        query: `
          mutation SetPayment($cartId: String!, $code: String!) {
            setPaymentMethodOnCart(
              input: {
                cart_id: $cartId
                payment_method: { code: $code }
              }
            ) {
              cart { id }
            }
          }
        `,
        variables: { cartId, code: 'checkmo' },
      }),
    });
    const paymentJson = await paymentRes.json();
    if (paymentJson.errors) throw new Error(paymentJson.errors[0].message);

    // Step 5: Place Order
    const placeOrderRes = await fetch(config.magentoGraphqlUrl, {
      method: 'POST',
      headers: MAGENTO_HEADERS,
      body: JSON.stringify({
        query: `
          mutation PlaceOrder($cartId: String!) {
            placeOrder(input: { cart_id: $cartId }) {
              order { order_number }
            }
          }
        `,
        variables: { cartId },
      }),
    });
    const placeOrderJson = await placeOrderRes.json();
    if (placeOrderJson.errors) throw new Error(placeOrderJson.errors[0].message);

    const orderNumber = placeOrderJson?.data?.placeOrder?.order?.order_number;

    return { success: true, orderNumber };
  } catch (err: any) {
    return { success: false, error: err.message || 'Checkout failed' };
  }
}