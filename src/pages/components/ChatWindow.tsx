import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Send, Loader2, Zap, Cpu, Plus, 
  MessageSquare, ChevronRight, Hash 
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
}

interface ChatSummary {
  [key: string]: string;
}

const ChatWindow = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<ChatSummary>({});
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const allChats: ChatSummary = await invoke('get_all_chats');
      setChats(allChats);
      
      const chatIds = Object.keys(allChats);
      if (chatIds.length > 0 && !activeChatId) {
        handleSwitchChat(chatIds[0]);
      } else if (chatIds.length === 0) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Hiba a chatek lekérésekor:", err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const handleNewChat = async () => {
    try {
      const newId: string = await invoke('create_new_chat');
      setActiveChatId(newId);
      setMessages([{
        id: 'welcome',
        content: "Szia! Én Mia vagyok. Miben segíthetek az új beszélgetésünkben?",
        sender: 'mia',
        timestamp: new Date()
      }]);
      fetchChats();
    } catch (err) {
      console.error("Új chat létrehozása sikertelen:", err);
    }
  };

  const handleSwitchChat = async (id: string) => {
    try {
      await invoke('switch_chat', { chatId: id });
      setActiveChatId(id);
      setMessages([]); 
    } catch (err) {
      console.error("Váltás sikertelen:", err);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now(),
      content: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response: MiaResponse = await invoke('ask_mia', { message: inputText });

      const aiMsg: Message = {
        id: Date.now() + 1,
        content: response.content,
        sender: 'mia',
        timestamp: new Date(),
        tokens: response.tokens,
        speed: response.speed
      };
      setMessages(prev => [...prev, aiMsg]);
      
      fetchChats();
    } catch (err) {
      console.error("Mia hiba:", err);
      setMessages(prev => [...prev, {
        id: 'error',
        content: "Bocsánat, hiba történt. Kérlek győződj meg róla, hogy a modellem be van-e töltve!",
        sender: 'mia',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      <div className="w-64 bg-slate-900/50 border-r border-slate-800/60 backdrop-blur-xl flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800/50">
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-600 p-2.5 rounded-xl hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-blue-500/10"
          >
            <Plus className="w-4 h-4" />
            <span className="font-semibold text-sm">Új beszélgetés</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {Object.entries(chats).map(([id, name]) => (
            <button
              key={id}
              onClick={() => handleSwitchChat(id)}
              className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all group ${
                activeChatId === id 
                ? 'bg-blue-600/10 border border-blue-500/20 text-blue-100' 
                : 'hover:bg-slate-800/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className={`w-4 h-4 shrink-0 ${activeChatId === id ? 'text-blue-400' : 'text-slate-500'}`} />
              <span className="text-xs truncate text-left flex-1 font-medium">{name}</span>
              {activeChatId === id && <ChevronRight className="w-3 h-3 text-blue-500" />}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800/50 text-[10px] text-slate-600 flex justify-between items-center">
          <span className="flex items-center"><Hash className="w-3 h-3 mr-1" /> v1.2.0</span>
          <span className="uppercase tracking-widest">Mia Brain</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900/20 via-slate-950 to-slate-950">
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl group transition-all duration-300`}>
                
                <div className={`flex items-center space-x-2 mb-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-tighter ${message.sender === 'user' ? 'text-blue-500' : 'text-cyan-500'}`}>
                    {message.sender === 'user' ? 'Te' : 'Mia AI'}
                  </span>
                  <span className="text-[9px] text-slate-600">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className={`rounded-2xl p-4 backdrop-blur-md shadow-sm border ${
                  message.sender === 'user'
                  ? 'bg-blue-600/10 border-blue-500/20 rounded-tr-none'
                  : 'bg-slate-800/50 border-slate-700/50 rounded-tl-none'
                }`}>
                  <div className="text-slate-200 text-sm leading-relaxed">
                    <MarkdownResponse content={message.content} />
                  </div>

                  {message.sender === 'mia' && message.speed && (
                    <div className="mt-4 flex items-center space-x-4 text-[9px] font-mono text-slate-500 border-t border-slate-700/30 pt-3">
                      <span className="flex items-center bg-slate-900/50 px-2 py-0.5 rounded-full">
                        <Zap className="w-3 h-3 mr-1 text-yellow-500" />
                        {message.speed.toFixed(1)} t/s
                      </span>
                      <span className="flex items-center bg-slate-900/50 px-2 py-0.5 rounded-full">
                        <Cpu className="w-3 h-3 mr-1 text-cyan-500" />
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
                <span className="text-[11px] text-slate-500 font-mono animate-pulse">Mia éppen gondolkodik...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-10 group-focus-within:opacity-25 transition duration-500"></div>
            <div className="relative flex items-end space-x-2 bg-slate-900/90 border border-slate-700/50 p-3 rounded-2xl shadow-2xl">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Írj ide Mia-nak..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-slate-100 placeholder-slate-600 resize-none py-2 px-1 max-h-40 text-sm custom-scrollbar"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isLoading}
                className={`p-2.5 rounded-xl transition-all duration-300 ${
                  inputText.trim() && !isLoading 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-center text-[9px] text-slate-600 mt-4 tracking-widest uppercase">
            RTX 3050 Accelerated • Llama CPP v2
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;