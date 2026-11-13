// app/checkout/page.tsx
'use client';

import { useState } from 'react';
import { processCheckoutAction } from '@/app/actions/checkout';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: 'customer@example.com',
    firstname: 'John',
    lastname: 'Doe',
    street: '123 Main St',
    city: 'Austin',
    region: 'TX',
    postcode: '78701',
    telephone: '555-0199',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cartId = localStorage.getItem('magento_cart_id');
    if (!cartId) {
      setError('Your shopping cart is empty.');
      setLoading(false);
      return;
    }

    const res = await processCheckoutAction({
      cartId,
      ...formData,
    });

    if (res.success) {
      localStorage.removeItem('magento_cart_id');
      window.dispatchEvent(new Event('cartUpdated'));
      alert(`Order placed successfully! Order # ${res.orderNumber}`);
      router.push('/products');
    } else {
      setError(res.error || 'Failed to place order.');
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-blue-400">Secure Checkout</h1>

        {error && <div className="bg-rose-950 border border-rose-800 text-rose-300 p-4 rounded-xl mb-6 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">First Name</label>
              <input type="text" name="firstname" value={formData.firstname} onChange={handleChange} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Last Name</label>
              <input type="text" name="lastname" value={formData.lastname} onChange={handleChange} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Street Address</label>
            <input type="text" name="street" value={formData.street} onChange={handleChange} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">State / Region</label>
              <input type="text" name="region" value={formData.region} onChange={handleChange} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Postal Code</label>
              <input type="text" name="postcode" value={formData.postcode} onChange={handleChange} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Phone Number</label>
            <input type="text" name="telephone" value={formData.telephone} onChange={handleChange} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition duration-200 shadow-lg cursor-pointer text-base mt-4"
          >
            {loading ? 'Processing Order...' : 'Place Order'}
          </button>
        </form>
      </div>
    </main>
  );
}