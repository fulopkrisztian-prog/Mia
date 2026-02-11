import { invoke } from '@tauri-apps/api/core';
import { Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import "../index.css";
import { useModelStore } from '../store/modelStore';
import { listen } from '@tauri-apps/api/event';

const FloatingIcon = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const isLoading = useModelStore((s) => s.isLoading);

  useEffect(() => {
    const unlistenPromise = listen('mia-loading-status', (event) => {
      console.log('[FloatingIcon] Esemény érkezett:', event.payload);
      useModelStore.getState().setLoading(!!event.payload);
    });

    const interval = setInterval(() => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 1000);
    }, 5000);

    return () => {
      clearInterval(interval);
      unlistenPromise.then(unlistenFn => unlistenFn())
    };
  }, []);

  const handleClick = async () => {
    try {
      setIsPressed(true);
      setTimeout(() => setIsPressed(false), 150);
      await invoke('toggle_main_window');
    } catch (error) {
      console.error('Failed to toggle main window:', error);
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center overflow-hidden bg-transparent p-4">

      <div
        data-tauri-drag-region
        className="relative w-[70px] h-[70px] cursor-pointer select-none"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute inset-[-6px] rounded-full bg-gradient-to-br transition-all duration-300 ${isLoading
              ? 'from-cyan-400/40 to-blue-500/40 opacity-100 blur-[15px] animate-pulse'
              : isHovered ? 'from-blue-500/20 to-cyan-500/20 opacity-80 scale-110 blur-[10px]' : 'opacity-30'
            }`} />

          <div className={`absolute inset-[-2px] rounded-full transition-all duration-300 ${isLoading
              ? 'shadow-[0_0_25px_rgba(34,211,238,0.7)] ring-2 ring-cyan-400/50'
              : isHovered ? 'shadow-[0_0_30px_rgba(59,130,246,0.8)]' : ''
            }`} />
        </div>

        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950/95 backdrop-blur-xl
            border transition-all duration-300 ease-out flex items-center justify-center
            ${isLoading ? 'border-cyan-400 scale-105' : isHovered ? 'border-blue-500/50 scale-105' : 'border-slate-800/60'}
            ${isPressed ? 'scale-95 border-blue-400/70' : ''}`}
        >
          {isLoading && (
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
          )}

          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-700/10 to-transparent pointer-events-none" />

          <div className={`relative transition-all duration-500 ease-out
            ${isLoading ? 'scale-75 opacity-50' : isHovered ? 'scale-110 rotate-3' : ''}
            ${isPressed ? 'scale-90' : ''}`}
          >
            <Sparkles
              className={`relative w-8 h-8 transition-all duration-500 ${isLoading
                  ? 'text-cyan-400'
                  : isHovered
                    ? 'text-blue-100 drop-shadow-[0_0_10px_rgba(147,197,253,0.8)]'
                    : 'text-slate-300 drop-shadow-[0_0_5px_rgba(147,197,253,0.4)]'
                }`}
              strokeWidth={1.5}
            />
          </div>

          {isPulsing && !isHovered && !isLoading && (
            <div className="absolute inset-0 rounded-full border-2 border-blue-400/40 animate-ping" />
          )}

        </div>

        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-slate-950 shadow-lg transition-all duration-500 ${isLoading ? 'bg-orange-500 shadow-orange-500/50' : 'bg-green-500 shadow-green-500/50'
          }`}>
          <div className={`absolute inset-0 rounded-full animate-ping ${isLoading ? 'bg-orange-400/50' : 'bg-green-400/50'
            }`} />
        </div>
      </div>
    </div>
  );
};

export default FloatingIcon;