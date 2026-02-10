import { useState, useEffect } from 'react';
import { Cpu, MemoryStick, Gauge } from 'lucide-react';

interface SystemMetrics {
  cpu: number;
  ram: number;
  gpu: number;
  vram: number;
}

const Monitor = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 45.2,
    ram: 78.5,
    gpu: 62.3,
    vram: 85.7
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.min(100, Math.max(0, prev.cpu + (Math.random() - 0.5) * 10)),
        ram: Math.min(100, Math.max(0, prev.ram + (Math.random() - 0.5) * 5)),
        gpu: Math.min(100, Math.max(0, prev.gpu + (Math.random() - 0.5) * 8)),
        vram: Math.min(100, Math.max(0, prev.vram + (Math.random() - 0.5) * 3))
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    unit = '%',
    details = ''
  }: {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    unit?: string;
    details?: string;
  }) => (
    <div className="p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 transition-all duration-300 hover:border-indigo-500/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-2xl ${color} bg-opacity-20`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
            {details && <p className="text-sm text-slate-400">{details}</p>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-slate-100">{value.toFixed(1)}{unit}</div>
          <div className={`text-sm ${value > 80 ? 'text-red-400' : value > 60 ? 'text-yellow-400' : 'text-green-400'}`}>
            {value > 80 ? 'High' : value > 60 ? 'Moderate' : 'Normal'}
          </div>
        </div>
      </div>
      
      <div className="relative h-3 rounded-full bg-slate-800/60 overflow-hidden">
        <div 
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="h-full p-4 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
          System Monitor
        </h1>
        <p className="text-slate-400">Real-time performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <MetricCard
          title="CPU Usage"
          value={metrics.cpu}
          icon={Cpu}
          color="bg-gradient-to-r from-cyan-500 to-blue-500"
          details="Intel Core i7-12700H"
        />
        
        <MetricCard
          title="RAM Usage"
          value={metrics.ram}
          icon={MemoryStick}
          color="bg-gradient-to-r from-emerald-500 to-green-500"
          details="32GB DDR5 @ 4800MHz"
        />
        
        <MetricCard
          title="GPU Usage"
          value={metrics.gpu}
          icon={Gauge}
          color="bg-gradient-to-r from-violet-500 to-purple-500"
          details="NVIDIA RTX 3050 4GB"
        />
        
        <MetricCard
          title="VRAM Usage"
          value={metrics.vram}
          icon={MemoryStick}
          color="bg-gradient-to-r from-rose-500 to-pink-500"
          details="3.8/4.0 GB allocated"
          unit=" GB"
        />
      </div>
    </div>
  );
};

export default Monitor;