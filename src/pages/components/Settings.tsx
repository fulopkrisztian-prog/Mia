import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Gamepad2, Globe, Clock, Save, RefreshCw, Plus, X as CloseIcon, Monitor, Palette } from 'lucide-react';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    searxngUrl: 'https://searx.example.com',
    launchOnStartup: true,
    games: [] as string[],
    monitorRefreshRate: 2000,
    chatHistoryLimit: 100,
    theme: 'dark',
  });

  const [newGame, setNewGame] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const checkFullscreen = () => {
      setIsFullscreen(window.innerWidth >= 1920);
    };

    checkFullscreen();
    window.addEventListener('resize', checkFullscreen);
    
    return () => window.removeEventListener('resize', checkFullscreen);
  }, []);

  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const savedData = await invoke('get_settings') as any;
        if (savedData) {
          setSettings({
            searxngUrl: savedData.searxngUrl,
            launchOnStartup: savedData.launchOnStartup,
            games: savedData.games || [],
            monitorRefreshRate: savedData.monitorRefreshRate || 2000,
            chatHistoryLimit: savedData.chatHistoryLimit || 100,
            theme: savedData.theme || 'dark',
          });
        }
      } catch (error) {
        console.error('Nem sikerült betölteni a beállításokat:', error);
      }
    };

    loadSavedSettings();
  }, []);

  const handleAddGame = () => {
    const cleanName = newGame.trim().toLowerCase();
    if (cleanName && !settings.games.includes(cleanName)) {
      setSettings({
        ...settings,
        games: [...settings.games, cleanName]
      });
      setNewGame('');
    }
  };

  const handleRemoveGame = (gameToRemove: string) => {
    setSettings({
      ...settings,
      games: settings.games.filter(game => game !== gameToRemove)
    });
  };

  const handleSave = async () => {
    setIsSaving(true);

    const payload = {
      settings: {
        games: settings.games,
        searxngUrl: settings.searxngUrl,
        launchOnStartup: settings.launchOnStartup,
        monitorRefreshRate: settings.monitorRefreshRate,
        chatHistoryLimit: settings.chatHistoryLimit,
        theme: settings.theme,
      }
    };

    try {
      await invoke('save_settings', payload);
      await new Promise(resolve => setTimeout(resolve, 600));
    } catch (error) {
      console.error('Mentési hiba:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Biztosan visszaállítod az alapértelmezett beállításokat?")) {
      setSettings({
        searxngUrl: 'https://searx.example.com',
        launchOnStartup: true,
        games: ['cs2.exe', 'valorant.exe', 'league of legends.exe'],
        monitorRefreshRate: 2000,
        chatHistoryLimit: 100,
        theme: 'dark',
      });
    }
  };

  const gridCols = isFullscreen ? 'lg:grid-cols-2' : 'lg:grid-cols-1';

  return (
    <div className="h-full overflow-y-auto custom-scrollbar select-none p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-slate-400 font-medium text-sm sm:text-base">Manage Mia's behavior and detection</p>
      </div>

      <div className={`grid ${gridCols} gap-4 sm:gap-6 max-w-7xl mx-auto`}>
        
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl">
          <div className="flex items-center space-x-3 mb-4 sm:mb-6">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 flex-shrink-0">
              <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-200 truncate">Game Detection</h2>
              <p className="text-xs text-slate-400 font-normal truncate">
                Mia hides automatically when these games run
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newGame}
                onChange={(e) => setNewGame(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddGame()}
                className="flex-1 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 text-sm transition-all shadow-inner"
                placeholder="Process name (e.g. game.exe)"
              />
              <button
                onClick={handleAddGame}
                className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-600/20 flex-shrink-0"
                title="Add game"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {settings.games.length === 0 && (
                <span className="text-xs text-slate-500 italic px-1">No games added yet...</span>
              )}
              {settings.games.map((game) => (
                <div
                  key={game}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300 group hover:border-blue-500/50 transition-all"
                >
                  <span className="font-medium tracking-tight truncate max-w-[120px] sm:max-w-[150px]">
                    {game}
                  </span>
                  <button
                    onClick={() => handleRemoveGame(game)}
                    className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Remove"
                  >
                    <CloseIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl">
          <div className="flex items-center space-x-3 mb-4 sm:mb-6">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 flex-shrink-0">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-200">Search Integration</h2>
              <p className="text-xs text-slate-400 font-normal">Configure web search settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
                SearXNG Instance URL
              </label>
              <input
                type="url"
                value={settings.searxngUrl}
                onChange={(e) => setSettings({ ...settings, searxngUrl: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-100 focus:outline-none focus:border-emerald-500/50 text-sm transition-all shadow-inner"
                placeholder="https://searx.be"
              />
            </div>
          </div>
        </div>

        {isFullscreen && (
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 flex-shrink-0">
                <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-200">Performance</h2>
                <p className="text-xs text-slate-400 font-normal">System monitoring and resource settings</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
                  Monitor Refresh Rate
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="500"
                    max="5000"
                    step="500"
                    value={settings.monitorRefreshRate}
                    onChange={(e) => setSettings({ ...settings, monitorRefreshRate: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-cyan-500 [&::-webkit-slider-thumb]:to-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-300 min-w-[60px]">
                    {settings.monitorRefreshRate}ms
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
                  Chat History Limit
                </label>
                <input
                  type="number"
                  value={settings.chatHistoryLimit}
                  onChange={(e) => setSettings({ ...settings, chatHistoryLimit: parseInt(e.target.value) })}
                  className="w-full p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-100 focus:outline-none focus:border-cyan-500/50 text-sm transition-all shadow-inner"
                  min="10"
                  max="1000"
                  step="10"
                />
              </div>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl">
          <div className="flex items-center space-x-3 mb-4 sm:mb-6">
            <div className="p-2 rounded-xl bg-slate-700/30 text-slate-300 flex-shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-200">System</h2>
              <p className="text-xs text-slate-400 font-normal">Application behavior and startup</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/40 border border-white/5">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-200 truncate">Launch on Startup</div>
                <div className="text-xs text-slate-500">Auto-start Mia with Windows</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={settings.launchOnStartup}
                  onChange={(e) => setSettings({ ...settings, launchOnStartup: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 transition-colors"></div>
              </label>
            </div>

            {isFullscreen && (
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/40 border border-white/5">
                <div className="flex items-center space-x-3">
                  <Palette className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-sm font-medium text-slate-200">Theme</div>
                    <div className="text-xs text-slate-500">Application appearance</div>
                  </div>
                </div>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-slate-600"
                >
                  <option value="dark">Dark</option>
                  <option value="darker">Darker</option>
                  <option value="oled">OLED Black</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/5">
        <div className={`flex flex-col ${isFullscreen ? 'sm:flex-row' : ''} justify-end space-y-3 ${isFullscreen ? 'sm:space-y-0 sm:space-x-3' : ''}`}>
          <button
            onClick={handleReset}
            className={`px-4 sm:px-5 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all flex items-center justify-center space-x-2 text-sm ${isFullscreen ? 'sm:w-auto' : 'w-full'}`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 sm:px-8 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 shadow-lg ${
              isSaving
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95 shadow-blue-600/30'
            } ${isFullscreen ? 'sm:w-auto' : 'w-full'}`}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-slate-500">
          {isFullscreen ? 'Fullscreen mode • ' : ''}
          {settings.games.length} games configured • Mia AI v1.2.0
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;