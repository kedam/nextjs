// app/products/page.tsx
import { Suspense } from 'react';
import ProductCard from './ProductCard';
import MiniCartDrawer from '@/app/components/MiniCartDrawer';
import { config } from '@/lib/config';

interface ProductOptionValue {
  value_index: number;
  label: string;
  uid: string;
}

interface ConfigurableOption {
  id: string;
  attribute_code: string;
  label: string;
  values: ProductOptionValue[];
}

interface VariantAttribute {
  code: string;
  value_index: number;
}

interface ProductVariant {
  product: {
    sku: string;
    name: string;
  };
  attributes: VariantAttribute[];
}

export interface ConfigurableProduct {
  name: string;
  sku: string;
  __typename: string;
  small_image: { url: string };
  price_range: {
    minimum_price: {
      regular_price: { value: number; currency: string };
    };
  };
  configurable_options?: ConfigurableOption[];
  variants?: ProductVariant[];
}

interface PageInfo {
  current_page: number;
  total_pages: number;
  page_size: number;
}

async function getProducts(page: number, pageSize: number = 6): Promise<{ items: ConfigurableProduct[]; pageInfo: PageInfo }> {
  const query = `
    query GetConfigurableProducts($currentPage: Int!, $pageSize: Int!) {
      products(search: "", pageSize: $pageSize, currentPage: $currentPage) {
        items {
          name
          sku
          __typename
          small_image { url }
          price_range {
            minimum_price {
              regular_price { value currency }
            }
          }
          ... on ConfigurableProduct {
            configurable_options {
              id
              attribute_code
              label
              values {
                value_index
                label
                uid
              }
            }
            variants {
              product {
                sku
                name
              }
              attributes {
                code
                value_index
              }
            }
          }
        }
        page_info { current_page total_pages page_size }
      }
    }
  `;

  try {
    const res = await fetch(config.magentoGraphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Store': 'default',
      },
      body: JSON.stringify({ query, variables: { currentPage: page, pageSize } }),
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const json = await res.json();
    return {
      items: json?.data?.products?.items || [],
      pageInfo: json?.data?.products?.page_info || { current_page: 1, total_pages: 1, page_size: pageSize },
    };
  } catch (error) {
    console.error('Failed to fetch from Magento GraphQL endpoint:', error);
    return {
      items: [],
      pageInfo: { current_page: page, total_pages: 1, page_size: pageSize },
    };
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const pageParam = Array.isArray(resolvedParams?.page) ? resolvedParams.page[0] : resolvedParams?.page;
  const currentPage = Number(pageParam) || 1;
  const pageSize = 6;

  const { items, pageInfo } = await getProducts(currentPage, pageSize);

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <MiniCartDrawer />
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-blue-400">Magento Configurable Catalog</h1>

        {items.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center text-zinc-400 mt-6">
            Unable to load products from Magento GraphQL endpoint. Please verify your Magento backend is running and `MAGENTO_GRAPHQL_URL` is correct.
          </div>
        ) : (
          <>
            <p className="text-zinc-400 mb-6">
              Showing page {pageInfo.current_page} of {pageInfo.total_pages}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {items.map((product) => (
                <ProductCard key={product.sku} product={product} />
              ))}
            </div>

            <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
              <a
                href={`/products?page=${Math.max(currentPage - 1, 1)}`}
                className={`px-4 py-2 rounded-lg font-medium bg-zinc-800 text-white transition hover:bg-zinc-700 ${
                  currentPage <= 1 ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                Previous
              </a>

              <span className="text-zinc-400 text-sm">
                Page {pageInfo.current_page} of {pageInfo.total_pages}
              </span>

              <a
                href={`/products?page=${Math.min(currentPage + 1, pageInfo.total_pages)}`}
                className={`px-4 py-2 rounded-lg font-medium bg-blue-600 text-white transition hover:bg-blue-500 ${
                  currentPage >= pageInfo.total_pages ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                Next
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}