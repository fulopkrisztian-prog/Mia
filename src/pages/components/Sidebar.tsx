import { MessageSquare, Activity, Settings } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SidebarProps {
  activeTab: 'chat' | 'monitor' | 'settings';
  onTabChange: (tab: 'chat' | 'monitor' | 'settings') => void;
}

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'monitor', label: 'System', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="w-20 h-full bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/50 flex flex-col items-center py-6 space-y-8">

      <div className="flex-1 flex flex-col items-center space-y-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "group relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-300",
                isActive 
                  ? "bg-gradient-to-br from-violet-600/40 to-indigo-600/40 border border-violet-500/50"
                  : "hover:bg-slate-800/40 hover:border-slate-700/50"
              )}
              title={tab.label}
            >
              {isActive && (
                <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-violet-400 to-indigo-400 rounded-r-full" />
              )}
              
              <Icon className={cn(
                "w-6 h-6 transition-all duration-300",
                isActive 
                  ? "text-violet-300" 
                  : "text-slate-400 group-hover:text-slate-300"
              )} />
              
              <span className={cn(
                "text-xs mt-1 transition-all duration-300",
                isActive 
                  ? "text-violet-300 font-medium" 
                  : "text-slate-500 group-hover:text-slate-400"
              )}>
                {tab.label}
              </span>
              
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-6 border-t border-slate-800/50">
        <div className="text-[10px] text-slate-500 text-center px-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mx-auto mb-1"></div>
          Online
        </div>
      </div>
    </div>
  );
};

export default Sidebar;