// app/products/ProductCard.tsx
'use client';

import { useState } from 'react';
import { ConfigurableProduct } from './page';

export default function ProductCard({ product }: { product: ConfigurableProduct }) {
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const price = product.price_range.minimum_price.regular_price;
  const imageUrl = product.small_image?.url || 'https://via.placeholder.com/300';
  const options = product.configurable_options || [];
  const variants = product.variants || [];

  const handleOptionChange = (attributeId: string, valueIndex: number) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [attributeId]: valueIndex,
    }));
  };

  const findMatchingVariant = () => {
    if (options.length === 0) return product.sku;

    if (Object.keys(selectedOptions).length < options.length) {
      return null;
    }

    const matchedVariant = variants.find((variant) => {
      return variant.attributes.every((attr) => {
        const matchingOpt = options.find((o) => o.attribute_code === attr.code);
        if (!matchingOpt) return false;
        return selectedOptions[matchingOpt.id] === attr.value_index;
      });
    });

    return matchedVariant ? matchedVariant.product.sku : null;
  };

  const handleAddToCart = async () => {
    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const childSku = findMatchingVariant();
      if (!childSku) {
        throw new Error('Please select all required product options (Size, Color, etc.).');
      }

      const selectedOptionUids: string[] = [];
      for (const opt of options) {
        const valIndex = selectedOptions[opt.id];
        const valObj = opt.values.find((v) => v.value_index === valIndex);
        if (valObj && valObj.uid) {
          selectedOptionUids.push(valObj.uid);
        }
      }

      const rawCartId = localStorage.getItem('magento_cart_id');
      const cartId = !rawCartId || rawCartId === 'null' || rawCartId === 'undefined' ? null : rawCartId;

      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentSku: product.sku,
          childSku,
          selectedOptions: selectedOptionUids,
          cartId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add configurable product to cart.');
      }

      if (data.cartId) {
        localStorage.setItem('magento_cart_id', data.cartId);
      }

      setMessage('Added to cart!');
      window.dispatchEvent(new Event('cartUpdated'));
      setTimeout(() => setMessage(null), 2500);
    } catch (err: any) {
      console.error('Configurable add to cart error:', err);
      setIsError(true);
      setMessage(err.message || 'Error adding to cart');
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between">
      <div>
        <div className="w-full h-48 bg-zinc-800 relative overflow-hidden">
          <img src={imageUrl} alt={product.name} className="object-cover w-full h-full hover:scale-105 transition duration-300" />
        </div>

        <div className="p-5">
          <h2 className="text-lg font-semibold mb-1 line-clamp-1">{product.name}</h2>
          <p className="text-zinc-400 text-xs mb-3">Parent SKU: {product.sku}</p>
          <span className="text-lg font-bold text-emerald-400 mb-4 block">
            {price.value} {price.currency}
          </span>

          {options.length > 0 && (
            <div className="space-y-3 mb-4">
              {options.map((opt) => (
                <div key={opt.id}>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">{opt.label}:</label>
                  <select
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    value={selectedOptions[opt.id] || ''}
                    onChange={(e) => handleOptionChange(opt.id, Number(e.target.value))}
                  >
                    <option value="">Choose {opt.label}</option>
                    {opt.values.map((val) => (
                      <option key={val.value_index} value={val.value_index}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-5 pt-0">
        <button
          onClick={handleAddToCart}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl transition duration-200 shadow-md cursor-pointer text-sm flex items-center justify-center gap-2"
        >
          {loading ? 'Adding...' : 'Add to Cart'}
        </button>
        {message && (
          <p className={`text-xs text-center font-medium mt-2 px-1 ${isError ? 'text-amber-400' : 'text-emerald-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}