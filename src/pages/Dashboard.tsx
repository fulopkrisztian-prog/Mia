import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { X, Maximize2, Copy } from 'lucide-react';

import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Monitor from './components/Monitor';
import SettingsPage from './components/Settings';

type TabType = 'chat' | 'monitor' | 'settings';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();

  useEffect(() => {
    const updateMaximized = async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };

    updateMaximized();

    const unlisten = appWindow.onResized(() => {
      updateMaximized();
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const handleClose = async () => {
    try {
      await invoke('hide_main_window');
    } catch (error) {
      console.error('Failed to hide window:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      await invoke('maximize_main_window');
    } catch (error) {
      console.error('Failed to toggle maximize:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatWindow />;
      case 'monitor':
        return <Monitor />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <ChatWindow />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      <div
        data-tauri-drag-region
        className="h-12 flex items-center justify-between px-4 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50 select-none"
      >
        <div className="flex items-center space-x-3 pointer-events-none">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="text-sm font-semibold text-slate-200">Mia AI Assistant</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleMaximize}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-800/60 transition-colors duration-200 group"
            title={isMaximized ? 'Restore Down' : 'Maximize'}
          >
            {isMaximized ? (
              <Copy className="w-4 h-4 text-slate-400 group-hover:text-slate-200 rotate-180" />
            ) : (
              <Maximize2 className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
            )}
          </button>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/20 transition-colors duration-200 group"
            title="Hide Window"
          >
            <X className="w-4 h-4 text-slate-400 group-hover:text-red-400" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 overflow-hidden">{renderContent()}</div>
      </div>

      <div className="h-6 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800/50 px-4 flex items-center justify-between">
        <div className="text-xs text-slate-400 flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>
            {activeTab === 'chat' && 'Ready to chat • RTX 3050 • Llama CPP v2'}
            {activeTab === 'monitor' && 'Monitoring system resources'}
            {activeTab === 'settings' && 'Configure your assistant'}
          </span>
        </div>
        <div className="text-xs text-slate-500">Mia AI v1.2.0</div>
      </div>
    </div>
  );
};

export default Dashboard;