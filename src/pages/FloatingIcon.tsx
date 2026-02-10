import { invoke } from '@tauri-apps/api/core';
import { Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

const FloatingIcon = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 1000);
    }, 5000);

    return () => clearInterval(interval);
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
          <div className={`absolute inset-[-6px] rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 blur-[10px] transition-all duration-300 ${
            isHovered ? 'opacity-80 scale-110' : 'opacity-30'
          }`} />
          
          <div className={`absolute inset-[-2px] rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-300 ${
            isHovered ? 'shadow-[0_0_30px_rgba(99,102,241,0.8)]' : ''
          }`} />
          
          <div className={`absolute inset-0 rounded-full ring-1 ring-inset ring-white/10 transition-all duration-300 ${
            isHovered ? 'ring-white/30' : ''
          }`} />
        </div>

        <div 
          className={`absolute inset-0 rounded-full bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950/95 backdrop-blur-xl
            border border-slate-800/60 transition-all duration-300 ease-out flex items-center justify-center
            ${isHovered ? 'border-violet-500/50 scale-105' : ''}
            ${isPressed ? 'scale-95 border-violet-400/70' : ''}`}
        >
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-700/10 to-transparent pointer-events-none" />
          <div className="absolute inset-0 rounded-full bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjA1Ii8+PC9zdmc+')] opacity-20 pointer-events-none" />
          
          <div className={`relative transition-all duration-500 ease-out
            ${isHovered ? 'scale-110 rotate-3' : ''}
            ${isPressed ? 'scale-90' : ''}`}
          >
            <div className={`absolute inset-0 bg-indigo-500/20 blur-xl rounded-full transition-all duration-500 ${
              isHovered ? 'opacity-80 scale-150' : 'opacity-0'
            }`} />
            
            <Sparkles 
              className={`relative w-8 h-8 transition-all duration-500 ${
                isHovered 
                  ? 'text-violet-100 drop-shadow-[0_0_10px_rgba(196,181,253,0.8)]' 
                  : 'text-indigo-200 drop-shadow-[0_0_5px_rgba(196,181,253,0.4)]'
              }`}
              strokeWidth={1.5}
            />
          </div>

          {isPulsing && !isHovered && (
            <div className="absolute inset-0 rounded-full border-2 border-violet-400/40 animate-ping" />
          )}
        </div>

        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full 
          bg-gradient-to-br from-green-500 to-emerald-400 border-2 border-slate-950 shadow-lg">
          <div className="absolute inset-0 rounded-full bg-green-400/50 animate-ping" />
        </div>
      </div>
    </div>
  );
};

export default FloatingIcon;