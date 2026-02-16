import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Send, Loader2, Zap, Cpu, Plus,
  MessageSquare, ChevronRight, Hash, Trash2,
  Sparkles, Brain, ShieldCheck, Globe
} from 'lucide-react';
import MarkdownResponse from './MarkdownResponse';

interface MiaResponse {
  content: string;
  tokens: number;
  speed: number;
}

interface Message {
  id: string | number;
  content: string;
  sender: 'user' | 'mia';
  timestamp: Date;
  tokens?: number;
  speed?: number;
  isSearch?: boolean;
}

interface ChatEntry {
  id: string;
  name: string;
  last_active: number;
}

type MiaMode = 'Auto' | 'Basic' | 'Philosophy' | 'Search';

const ChatWindow = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<ChatEntry[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [miaMode, setMiaMode] = useState<MiaMode>('Auto');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChats(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChats = async (shouldLoadActive = false) => {
    try {
      const allChats: ChatEntry[] = await invoke('get_all_chats');
      setChats(allChats);

      if (shouldLoadActive && allChats.length > 0 && !activeChatId) {
        handleSwitchChat(allChats[0].id);
      }
    } catch (err) {
      console.error('Hiba a chatek lekérésekor:', err);
    }
  };

  const handleModeChange = async (newMode: MiaMode) => {
    setMiaMode(newMode);
    try {
      await invoke('set_mia_mode', { mode: newMode });
    } catch (err) {
      console.error('Hiba a mód váltásakor:', err);
    }
  };

  const handleNewChat = async () => {
    try {
      const newId: string = await invoke('create_new_chat');
      setActiveChatId(newId);
      
      setMessages([
        {
          id: 'welcome',
          content: 'Szia! Én Mia vagyok. Miben segíthetek az új beszélgetésünkben?',
          sender: 'mia',
          timestamp: new Date(),
        },
      ]);
      
      await fetchChats();
    } catch (err) {
      console.error('Új chat létrehozása sikertelen:', err);
    }
  };

  const handleSwitchChat = async (id: string) => {
    if (id === activeChatId && messages.length > 0) return;

    try {
      await invoke('switch_chat', { chatId: id });
      setActiveChatId(id);

      const history: any[] = await invoke('get_chat_history', { chatId: id });

      const formattedMessages: Message[] = history.map((m, index) => ({
        id: `${id}-${index}`,
        content: m.content,
        sender: m.role === 'user' ? 'user' : 'mia',
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      }));

      setMessages(formattedMessages);
    } catch (err) {
      console.error('Váltás sikertelen:', err);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Biztosan törölni szeretnéd ezt a beszélgetést?")) return;

    try {
      await invoke('delete_chat', { chatId: id });
      if (id === activeChatId) {
        setMessages([]);
        setActiveChatId('');
      }
      await fetchChats(true);
    } catch (err) {
      console.error('Törlés sikertelen:', err);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const currentInput = inputText;
    const userMsg: Message = {
      id: Date.now(),
      content: currentInput,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response: MiaResponse = await invoke('ask_mia', { message: currentInput });

      const aiMsg: Message = {
        id: Date.now() + 1,
        content: response.content,
        sender: 'mia',
        timestamp: new Date(),
        tokens: response.tokens,
        speed: response.speed,
        isSearch: miaMode === 'Search'
      };
      
      setMessages((prev) => [...prev, aiMsg]);
      await fetchChats();
    } catch (err) {
      console.error('Mia hiba:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'error',
          content: 'Hiba történt. Kérlek ellenőrizd az internetkapcsolatod vagy a modellt!',
          sender: 'mia',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <div className="w-64 bg-slate-900/50 border-r border-slate-800/60 backdrop-blur-xl flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800/50">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-600 p-2.5 rounded-xl hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-blue-500/10"
          >
            <Plus className="w-4 h-4 text-white" />
            <span className="font-semibold text-sm text-white">Új beszélgetés</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => handleSwitchChat(chat.id)}
              className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all group relative border ${
                activeChatId === chat.id
                  ? 'bg-blue-600/10 border-blue-500/30 text-blue-100'
                  : 'hover:bg-slate-800/40 border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className={`w-4 h-4 shrink-0 ${activeChatId === chat.id ? 'text-blue-400' : 'text-slate-500'}`} />
              <span className="text-xs truncate text-left flex-1 font-medium pr-6">{chat.name}</span>
              
              <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div 
                  onClick={(e) => handleDeleteChat(e, chat.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
              </div>

              {activeChatId === chat.id && <ChevronRight className="w-3 h-3 text-blue-500 shrink-0" />}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800/50 text-[10px] text-slate-600 flex justify-between items-center font-mono">
          <span className="flex items-center"><Hash className="w-3 h-3 mr-1" /> v1.4.0</span>
          <span className="uppercase tracking-widest">Mia Hybrid Core</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/20 via-slate-950 to-slate-950">
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
               <Brain className="w-16 h-16 mb-4 text-cyan-500" />
               <p className="text-sm font-mono uppercase tracking-[0.3em]">Mia Neural Link Ready</p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-2xl group transition-all duration-300">
                <div className={`flex items-center space-x-2 mb-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${message.sender === 'user' ? 'text-blue-500' : 'text-cyan-500'}`}>
                    {message.sender === 'user' ? 'Te' : 'Mia AI'}
                  </span>
                  {message.isSearch && (
                     <span className="flex items-center text-[9px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md font-bold uppercase">
                        <Globe className="w-2.5 h-2.5 mr-1" /> Live Web
                     </span>
                  )}
                  <span className="text-[9px] text-slate-600 font-mono">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className={`rounded-2xl p-4 backdrop-blur-md shadow-sm border ${
                    message.sender === 'user'
                      ? 'bg-blue-600/10 border-blue-500/20 rounded-tr-none'
                      : 'bg-slate-800/50 border-slate-700/50 rounded-tl-none'
                }`}>
                  <div className="text-slate-200 text-sm leading-relaxed break-words">
                    <MarkdownResponse content={message.content} />
                  </div>

                  {message.sender === 'mia' && message.speed !== undefined && (
                    <div className="mt-4 flex items-center space-x-4 text-[9px] font-mono text-slate-500 border-t border-slate-700/30 pt-3">
                      <span className="flex items-center bg-slate-900/40 px-2 py-0.5 rounded-full border border-slate-800">
                        <Zap className="w-3 h-3 mr-1 text-yellow-500 fill-yellow-500/20" />
                        {message.speed.toFixed(1)} tok/s
                      </span>
                      <span className="flex items-center bg-slate-900/40 px-2 py-0.5 rounded-full border border-slate-800">
                        <Cpu className="w-3 h-3 mr-1 text-cyan-500 fill-cyan-500/20" />
                        {message.tokens} tokens
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="bg-slate-800/30 border border-slate-700/20 rounded-2xl p-4 flex items-center space-x-3">
                <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
                <span className="text-[11px] text-slate-500 font-mono animate-pulse uppercase tracking-tight">
                    {miaMode === 'Search' ? 'Mia éppen böngészi a világhálót...' : 
                     miaMode === 'Philosophy' ? 'Mia mélyen elgondolkodott...' : 
                     'Mia válaszol...'}
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
          <div className="max-w-4xl mx-auto mb-4 flex justify-center">
             <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700/50 backdrop-blur-md shadow-2xl overflow-x-auto no-scrollbar">
                {[
                  { id: 'Auto', icon: Brain, label: 'Auto' },
                  { id: 'Basic', icon: ShieldCheck, label: 'Basic' },
                  { id: 'Philosophy', icon: Sparkles, label: 'Philo' },
                  { id: 'Search', icon: Globe, label: 'Search' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => handleModeChange(mode.id as MiaMode)}
                    className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${
                      miaMode === mode.id 
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg' 
                      : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <mode.icon className="w-3 h-3" />
                    <span>{mode.label}</span>
                  </button>
                ))}
             </div>
          </div>

          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-10 group-focus-within:opacity-20 transition duration-500"></div>
            
            <div className="relative flex items-end space-x-2 bg-slate-900/90 border border-slate-700/50 p-3 rounded-2xl shadow-2xl backdrop-blur-xl">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder={
                  miaMode === 'Search' ? "Mire keressek rá a neten?" : 
                  miaMode === 'Philosophy' ? "Vess fel egy mély gondolatot..." : 
                  "Kérdezz bármit..."
                }
                className="flex-1 bg-transparent border-none focus:ring-0 text-slate-100 placeholder-slate-600 resize-none py-2 px-1 max-h-40 text-sm custom-scrollbar"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isLoading}
                className={`p-2.5 rounded-xl transition-all duration-300 ${
                  inputText.trim() && !isLoading
                    ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="mt-3 text-center flex justify-center items-center space-x-4">
             <span className="text-[9px] text-slate-700 uppercase tracking-[0.2em] font-bold">RTX 3050 Accelerated AI</span>
             <div className="h-1 w-1 rounded-full bg-slate-800"></div>
             <span className="text-[9px] text-slate-700 uppercase tracking-[0.2em] font-bold">
                Mode: <span className={miaMode === 'Search' ? 'text-emerald-600' : 'text-slate-600'}>{miaMode}</span>
             </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;