import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Package, Clock, CheckCircle, XCircle } from 'lucide-react';

type OrderWithItems = {
  id: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  items: {
    id: string;
    quantity: number;
    item_total: number;
    laundry_item: {
      name: string;
    };
    services: string[];
  }[];
};

export function OrderHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (ordersData) {
        const ordersWithItems = await Promise.all(
          ordersData.map(async (order) => {
            const { data: items } = await supabase
              .from('order_items')
              .select(`
                id,
                quantity,
                item_total,
                services,
                laundry_item:laundry_items(name)
              `)
              .eq('order_id', order.id);

            return {
              ...order,
              items: items || [],
            };
          })
        );

        setOrders(ordersWithItems as OrderWithItems[]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'processing':
        return <Package className="w-5 h-5 text-blue-400" />;
      case 'ready':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400 bg-yellow-950/30 border-yellow-900/50';
      case 'processing':
        return 'text-blue-400 bg-blue-950/30 border-blue-900/50';
      case 'ready':
        return 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50';
      case 'completed':
        return 'text-green-400 bg-green-950/30 border-green-900/50';
      case 'cancelled':
        return 'text-red-400 bg-red-950/30 border-red-900/50';
      default:
        return 'text-zinc-400 bg-zinc-950/30 border-zinc-900/50';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-white text-xl">Loading orders...</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl p-12 border border-zinc-800 text-center">
        <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No orders yet</h3>
        <p className="text-zinc-400">Create your first laundry order to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Your Orders</h2>
      {orders.map((order) => (
        <div key={order.id} className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(order.status)}
              <div>
                <h3 className="text-white font-semibold">
                  Order #{order.id.slice(0, 8).toUpperCase()}
                </h3>
                <p className="text-zinc-400 text-sm">
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium border capitalize ${getStatusColor(
                  order.status
                )}`}
              >
                {order.status}
              </span>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {order.items.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-zinc-800"
              >
                <div>
                  <span className="text-white">{item.laundry_item.name}</span>
                  <span className="text-zinc-500 text-sm ml-2">x{item.quantity}</span>
                </div>
                <span className="text-zinc-300">${item.item_total.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {order.notes && (
            <div className="mb-4 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
              <p className="text-sm text-zinc-400">
                <span className="font-medium text-zinc-300">Notes:</span> {order.notes}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-zinc-700">
            <span className="text-zinc-400 font-medium">Total</span>
            <span className="text-2xl font-bold text-emerald-400">
              ${order.total_amount.toFixed(2)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
