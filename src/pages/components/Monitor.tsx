import { useState, useEffect } from 'react';
import { Cpu, MemoryStick, Gauge, HardDrive, Activity, Thermometer } from 'lucide-react';

interface SystemMetrics {
  cpu: number;
  ram: number;
  gpu: number;
  vram: number;
  disk: number;
  temp: number;
}

const Monitor = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 45.2,
    ram: 78.5,
    gpu: 62.3,
    vram: 85.7,
    disk: 34.8,
    temp: 68.4
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.min(100, Math.max(0, prev.cpu + (Math.random() - 0.5) * 10)),
        ram: Math.min(100, Math.max(0, prev.ram + (Math.random() - 0.5) * 5)),
        gpu: Math.min(100, Math.max(0, prev.gpu + (Math.random() - 0.5) * 8)),
        vram: Math.min(100, Math.max(0, prev.vram + (Math.random() - 0.5) * 3)),
        disk: Math.min(100, Math.max(0, prev.disk + (Math.random() - 0.4) * 2)),
        temp: Math.min(100, Math.max(0, prev.temp + (Math.random() - 0.5) * 4))
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
    <div className="p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 transition-all duration-300 hover:border-slate-600/50">
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
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
          System Monitor
        </h1>
        <p className="text-slate-400">Real-time performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="CPU Usage"
          value={metrics.cpu}
          icon={Cpu}
          color="bg-gradient-to-r from-blue-500 to-cyan-500"
          details="Intel Core i7-12700H"
        />
        
        <MetricCard
          title="RAM Usage"
          value={metrics.ram}
          icon={MemoryStick}
          color="bg-gradient-to-r from-emerald-500 to-teal-500"
          details="32GB DDR5 @ 4800MHz"
        />
        
        <MetricCard
          title="GPU Usage"
          value={metrics.gpu}
          icon={Gauge}
          color="bg-gradient-to-r from-sky-500 to-blue-500"
          details="NVIDIA RTX 3050 4GB"
        />
        
        <MetricCard
          title="VRAM Usage"
          value={metrics.vram}
          icon={MemoryStick}
          color="bg-gradient-to-r from-indigo-500 to-blue-500"
          details="3.8/4.0 GB allocated"
          unit=" GB"
        />

        <MetricCard
          title="Disk Usage"
          value={metrics.disk}
          icon={HardDrive}
          color="bg-gradient-to-r from-slate-500 to-slate-400"
          details="512GB NVMe SSD"
        />

        <MetricCard
          title="CPU Temp"
          value={metrics.temp}
          icon={Thermometer}
          color="bg-gradient-to-r from-orange-500 to-red-500"
          details="CPU Temperature"
          unit="°C"
        />
      </div>

      <div className="p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-xl bg-slate-800/50">
            <Activity className="w-5 h-5 text-slate-300" />
          </div>
          <h2 className="text-lg font-semibold text-slate-200">System Status</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-slate-800/40">
            <div className="text-xs text-slate-400 mb-1">CPU Load</div>
            <div className={`text-sm font-medium ${metrics.cpu > 80 ? 'text-red-300' : 'text-green-300'}`}>
              {metrics.cpu > 80 ? 'Heavy' : 'Normal'}
            </div>
          </div>
          
          <div className="p-3 rounded-xl bg-slate-800/40">
            <div className="text-xs text-slate-400 mb-1">Memory</div>
            <div className={`text-sm font-medium ${metrics.ram > 85 ? 'text-red-300' : 'text-blue-300'}`}>
              {metrics.ram > 85 ? 'Critical' : 'Stable'}
            </div>
          </div>
          
          <div className="p-3 rounded-xl bg-slate-800/40">
            <div className="text-xs text-slate-400 mb-1">GPU Status</div>
            <div className={`text-sm font-medium ${metrics.gpu > 90 ? 'text-red-300' : 'text-emerald-300'}`}>
              {metrics.gpu > 90 ? 'High Load' : 'Optimal'}
            </div>
          </div>
          
          <div className="p-3 rounded-xl bg-slate-800/40">
            <div className="text-xs text-slate-400 mb-1">Temperature</div>
            <div className={`text-sm font-medium ${metrics.temp > 80 ? 'text-red-300' : 'text-slate-300'}`}>
              {metrics.temp > 80 ? 'Hot' : 'Normal'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitor;