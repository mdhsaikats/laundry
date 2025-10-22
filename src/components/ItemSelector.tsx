import { useState } from 'react';
import { LaundryItem, Service } from '../lib/supabase';
import { Plus, Minus, Shirt } from 'lucide-react';

type ItemSelectorProps = {
  items: LaundryItem[];
  services: Service[];
  onAddToCart: (item: LaundryItem, quantity: number, selectedServices: Service[]) => void;
};

export function ItemSelector({ items, services, onAddToCart }: ItemSelectorProps) {
  const [selectedItem, setSelectedItem] = useState<LaundryItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);

  const handleServiceToggle = (service: Service) => {
    if (selectedServices.find((s) => s.id === service.id)) {
      setSelectedServices(selectedServices.filter((s) => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleAddToCart = () => {
    if (selectedItem && selectedServices.length > 0) {
      onAddToCart(selectedItem, quantity, selectedServices);
      setSelectedItem(null);
      setQuantity(1);
      setSelectedServices([]);
    }
  };

  const calculateItemTotal = () => {
    if (!selectedItem || selectedServices.length === 0) return 0;
    const serviceMultiplier = selectedServices.reduce((sum, service) => sum + service.price_multiplier, 0);
    return selectedItem.base_price * quantity * serviceMultiplier;
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <h2 className="text-2xl font-bold text-white mb-6">Select Clothing Type</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedItem?.id === item.id
                  ? 'border-emerald-500 bg-emerald-950/30'
                  : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <Shirt className="w-8 h-8 text-emerald-400" />
                <span className="text-white font-medium text-sm">{item.name}</span>
                <span className="text-zinc-400 text-xs">${item.base_price.toFixed(2)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedItem && (
        <>
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <h2 className="text-2xl font-bold text-white mb-6">Select Quantity</h2>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-4xl font-bold text-white w-20 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <h2 className="text-2xl font-bold text-white mb-6">Select Services</h2>
            <div className="space-y-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceToggle(service)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                    selectedServices.find((s) => s.id === service.id)
                      ? 'border-emerald-500 bg-emerald-950/30'
                      : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">{service.name}</h3>
                      <p className="text-zinc-400 text-sm">{service.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-semibold">
                        {service.price_multiplier}x
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-400">Item Total</span>
              <span className="text-3xl font-bold text-emerald-400">
                ${calculateItemTotal().toFixed(2)}
              </span>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={selectedServices.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition duration-200"
            >
              {selectedServices.length === 0 ? 'Select at least one service' : 'Add to Order'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
