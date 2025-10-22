import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, LaundryItem, Service } from '../lib/supabase';
import { ItemSelector } from './ItemSelector';
import { ServiceSelector } from './ServiceSelector';
import { OrderSummary } from './OrderSummary';
import { OrderHistory } from './OrderHistory';
import { LogOut, ShoppingBag, History } from 'lucide-react';

export type CartItem = {
  item: LaundryItem;
  quantity: number;
  selectedServices: Service[];
};

export function LaundryApp() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [laundryItems, setLaundryItems] = useState<LaundryItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [itemsRes, servicesRes] = await Promise.all([
        supabase.from('laundry_items').select('*').order('name'),
        supabase.from('services').select('*').order('name'),
      ]);

      if (itemsRes.data) setLaundryItems(itemsRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: LaundryItem, quantity: number, selectedServices: Service[]) => {
    const existingIndex = cart.findIndex((cartItem) => cartItem.item.id === item.id);

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex] = { item, quantity, selectedServices };
      setCart(newCart);
    } else {
      setCart([...cart, { item, quantity, selectedServices }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((cartItem) => cartItem.item.id !== itemId));
  };

  const calculateTotal = () => {
    return cart.reduce((total, cartItem) => {
      const serviceMultiplier = cartItem.selectedServices.reduce(
        (sum, service) => sum + service.price_multiplier,
        0
      );
      return total + cartItem.item.base_price * cartItem.quantity * serviceMultiplier;
    }, 0);
  };

  const handleOrderComplete = () => {
    setCart([]);
    setActiveTab('history');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">LaundryPro</h1>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'new'
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            New Order
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <History className="w-5 h-5" />
            Order History
          </button>
        </div>

        {activeTab === 'new' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <ItemSelector
                items={laundryItems}
                services={services}
                onAddToCart={addToCart}
              />
            </div>
            <div className="lg:col-span-1">
              <OrderSummary
                cart={cart}
                total={calculateTotal()}
                onRemoveItem={removeFromCart}
                onOrderComplete={handleOrderComplete}
              />
            </div>
          </div>
        ) : (
          <OrderHistory />
        )}
      </div>
    </div>
  );
}
