import { useState } from 'react';
import { CartItem } from './LaundryApp';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, ShoppingCart, Loader2 } from 'lucide-react';

type OrderSummaryProps = {
  cart: CartItem[];
  total: number;
  onRemoveItem: (itemId: string) => void;
  onOrderComplete: () => void;
};

export function OrderSummary({ cart, total, onRemoveItem, onOrderComplete }: OrderSummaryProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');

  const handlePlaceOrder = async () => {
    if (!user || cart.length === 0) return;

    setLoading(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: total,
          status: 'pending',
          notes: notes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map((cartItem) => {
        const serviceMultiplier = cartItem.selectedServices.reduce(
          (sum, service) => sum + service.price_multiplier,
          0
        );
        return {
          order_id: order.id,
          laundry_item_id: cartItem.item.id,
          quantity: cartItem.quantity,
          services: cartItem.selectedServices.map((s) => s.id),
          item_total: cartItem.item.base_price * cartItem.quantity * serviceMultiplier,
        };
      });

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

      if (itemsError) throw itemsError;

      setNotes('');
      onOrderComplete();
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 sticky top-24">
      <div className="flex items-center gap-2 mb-6">
        <ShoppingCart className="w-6 h-6 text-emerald-400" />
        <h2 className="text-2xl font-bold text-white">Order Summary</h2>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500">Your cart is empty</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {cart.map((cartItem) => {
              const serviceMultiplier = cartItem.selectedServices.reduce(
                (sum, service) => sum + service.price_multiplier,
                0
              );
              const itemTotal = cartItem.item.base_price * cartItem.quantity * serviceMultiplier;

              return (
                <div
                  key={cartItem.item.id}
                  className="bg-zinc-800 rounded-lg p-4 border border-zinc-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">{cartItem.item.name}</h3>
                      <p className="text-zinc-400 text-sm">Quantity: {cartItem.quantity}</p>
                    </div>
                    <button
                      onClick={() => onRemoveItem(cartItem.item.id)}
                      className="text-red-400 hover:text-red-300 transition p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1 mb-2">
                    {cartItem.selectedServices.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-zinc-500">{service.name}</span>
                        <span className="text-emerald-400">{service.price_multiplier}x</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-700">
                    <span className="text-zinc-400 text-sm">Subtotal</span>
                    <span className="text-white font-semibold">${itemTotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-6">
            <label htmlFor="notes" className="block text-sm font-medium text-zinc-300 mb-2">
              Special Instructions
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests or instructions..."
              rows={3}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
            />
          </div>

          <div className="border-t border-zinc-700 pt-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400">Total Amount</span>
              <span className="text-3xl font-bold text-emerald-400">${total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition duration-200 flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                Placing Order...
              </>
            ) : (
              'Place Order'
            )}
          </button>
        </>
      )}
    </div>
  );
}
