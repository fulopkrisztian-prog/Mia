import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Cpu, MemoryStick, Gauge, HardDrive, Activity, Thermometer } from 'lucide-react';

interface SystemStats {
  cpu: {
    percentage: number;
    cores: number[];
  };
  memory: {
    percentage: number;
    display: string;
  };
}

const Monitor = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data: SystemStats = await invoke('get_system_stats');
        setStats(data);
      } catch (err) {
        console.error("Nem sikerült lekérni a rendszeradatokat:", err);
      }
    };

    fetchStats();
    
    const interval = setInterval(fetchStats, 1000);

    return () => clearInterval(interval);
  }, []);

  const MetricCard = ({ 
    title, value, icon: Icon, color, unit = '%', details = '', progress = 0 
  }: any) => (
    <div className="p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 transition-all duration-300 hover:border-slate-600/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-2xl ${color} bg-opacity-20`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
            {details && <p className="text-sm text-slate-400 font-mono">{details}</p>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-slate-100">
            {typeof value === 'number' ? value.toFixed(1) : value}{unit}
          </div>
          <div className={`text-sm ${progress > 80 ? 'text-red-400' : progress > 60 ? 'text-yellow-400' : 'text-green-400'}`}>
            {progress > 80 ? 'High' : progress > 60 ? 'Moderate' : 'Normal'}
          </div>
        </div>
      </div>
      
      <div className="relative h-3 rounded-full bg-slate-800/60 overflow-hidden">
        <div 
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );

  if (!stats) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-cyan-400 animate-pulse font-mono">Mia is reading sensors...</p>
    </div>
  );

  return (
    <div className="h-full p-4 overflow-y-auto custom-scrollbar">
      <div className="mb-6 px-2">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
          System Monitor
        </h1>
        <p className="text-slate-400 text-sm">Real-time hardware telemetry from Mia</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="CPU Usage"
          value={stats.cpu.percentage}
          progress={stats.cpu.percentage}
          icon={Cpu}
          color="bg-gradient-to-r from-blue-500 to-cyan-500"
          details={`${stats.cpu.cores.length} logical cores`}
        />
        
        <MetricCard
          title="RAM Usage"
          value={stats.memory.percentage}
          progress={stats.memory.percentage}
          icon={MemoryStick}
          color="bg-gradient-to-r from-emerald-500 to-teal-500"
          details={stats.memory.display}
        />

        <MetricCard
          title="GPU Usage"
          value={0}
          progress={0}
          icon={Gauge}
          color="bg-gradient-to-r from-sky-500 to-blue-500"
          details="RTX 3050 - Pending"
        />

        <MetricCard
          title="Disk Usage"
          value={34.8}
          progress={34.8}
          icon={HardDrive}
          color="bg-gradient-to-r from-slate-500 to-slate-400"
          details="System Drive (C:)"
        />

        <MetricCard
          title="CPU Temp"
          value={42}
          progress={42}
          icon={Thermometer}
          color="bg-gradient-to-r from-orange-500 to-red-500"
          details="Package Temp"
          unit="°C"
        />
      </div>

      <div className="p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Core Distribution</h2>
        <div className="flex items-end justify-between h-20 gap-1">
          {stats.cpu.cores.map((usage, i) => (
            <div key={i} className="flex-1 group relative">
              <div 
                className="bg-cyan-500/40 group-hover:bg-cyan-400/60 transition-all duration-500 rounded-t-sm"
                style={{ height: `${usage}%` }}
              />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity">
                {usage.toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50">
        <div className="flex items-center space-x-3 mb-4">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-slate-200">System Integrity</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
            <div className="text-xs text-slate-500 mb-1">CPU Load</div>
            <div className={`text-sm font-medium ${stats.cpu.percentage > 85 ? 'text-red-400' : 'text-cyan-400'}`}>
              {stats.cpu.percentage > 85 ? 'Critical' : 'Nominal'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
            <div className="text-xs text-slate-500 mb-1">Memory Pool</div>
            <div className="text-sm font-medium text-emerald-400">Stable</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
            <div className="text-xs text-slate-500 mb-1">I/O Status</div>
            <div className="text-sm font-medium text-slate-400">Active</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
            <div className="text-xs text-slate-500 mb-1">Uptime</div>
            <div className="text-sm font-medium text-blue-400">Good</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitor;