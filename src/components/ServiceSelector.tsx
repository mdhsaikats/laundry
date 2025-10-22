import { Service } from '../lib/supabase';

type ServiceSelectorProps = {
  services: Service[];
  selectedServices: Service[];
  onToggleService: (service: Service) => void;
};

export function ServiceSelector({
  services,
  selectedServices,
  onToggleService,
}: ServiceSelectorProps) {
  return (
    <div className="space-y-3">
      {services.map((service) => (
        <button
          key={service.id}
          onClick={() => onToggleService(service)}
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
  );
}
