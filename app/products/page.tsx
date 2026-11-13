// app/products/page.tsx
import { Suspense } from 'react';
import AddToCartButton from './AddToCartButton';
import { config } from '@/lib/config';

interface Product {
  name: string;
  sku: string;
  small_image: { url: string };
  price_range: {
    minimum_price: {
      regular_price: { value: number; currency: string };
    };
  };
}

interface PageInfo {
  current_page: number;
  total_pages: number;
  page_size: number;
}

async function getProducts(
  page: number,
  pageSize: number = 6
): Promise<{ items: Product[]; pageInfo: PageInfo }> {
  const query = `
    query GetPaginatedProducts($currentPage: Int!, $pageSize: Int!) {
      products(search: "", pageSize: $pageSize, currentPage: $currentPage) {
        items {
          name
          sku
          small_image { url }
          price_range {
            minimum_price {
              regular_price { value currency }
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { currentPage: page, pageSize } }),
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const json = await res.json();
    return {
      items: json?.data?.products?.items || [],
      pageInfo: json?.data?.products?.page_info || {
        current_page: 1,
        total_pages: 1,
        page_size: pageSize,
      },
    };
  } catch (error) {
    console.error('Failed to fetch from Magento GraphQL endpoint:', error);
    return {
      items: [],
      pageInfo: { current_page: page, total_pages: 1, page_size: pageSize },
    };
  }
}

async function ProductGrid({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const pageParam = Array.isArray(resolvedParams?.page)
    ? resolvedParams.page[0]
    : resolvedParams?.page;
  const currentPage = Number(pageParam) || 1;
  const pageSize = 6;

  const { items: products, pageInfo } = await getProducts(currentPage, pageSize);

  if (products.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center text-zinc-400">
        Unable to load products at the moment. Please check your internet connection or try again later.
      </div>
    );
  }

  return (
    <>
      <p className="text-zinc-400 mb-6">
        Showing page {pageInfo.current_page} of {pageInfo.total_pages}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {products.map((product) => {
          const price = product.price_range.minimum_price.regular_price;
          const imageUrl = product.small_image?.url || 'https://via.placeholder.com/300';

          return (
            <div
              key={product.sku}
              className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="w-full h-48 bg-zinc-800 relative overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="object-cover w-full h-full hover:scale-105 transition duration-300"
                  />
                </div>

                <div className="p-5">
                  <h2 className="text-lg font-semibold mb-1 line-clamp-1">{product.name}</h2>
                  <p className="text-zinc-400 text-xs mb-3">SKU: {product.sku}</p>
                  <span className="text-lg font-bold text-emerald-400">
                    {price.value} {price.currency}
                  </span>
                </div>
              </div>

              <div className="p-5 pt-0">
                <AddToCartButton sku={product.sku} productName={product.name} />
              </div>
            </div>
          );
        })}
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
  );
}

export default function ProductsPage(props: PageProps<'/products'>) {
  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-blue-400">Magento Venia Catalog</h1>

        <Suspense fallback={<div className="text-zinc-400 py-12 text-center">Loading catalog products...</div>}>
      
        </Suspense>
      </div>
    </main>
  );
}