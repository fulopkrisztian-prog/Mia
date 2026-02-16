import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Send, Loader2, Zap, Cpu } from 'lucide-react'; 
import MarkdownResponse from './MarkdownResponse';

interface MiaResponse {
  content: string;
  tokens: number;
  speed: number;
}

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'mia';
  timestamp: Date;
  tokens?: number;
  speed?: number;
}

const ChatWindow = () => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 1, 
      content: "Hi! I'm Mia, your personal assistant. How can I assist you today?", 
      sender: 'mia', 
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const currentInput = inputText;
    const userMessage: Message = {
      id: Date.now(),
      content: currentInput,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response: MiaResponse = await invoke('ask_mia', { message: currentInput });

      const aiMessage: Message = {
        id: Date.now() + 1,
        content: response.content,
        sender: 'mia',
        timestamp: new Date(),
        tokens: response.tokens,
        speed: response.speed
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error("Hiba történt Mia hívása közben:", err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        content: "Bocsánat, hiba történt a feldolgozás közben. Kérlek ellenőrizd, hogy a modellem be van-e töltve!",
        sender: 'mia',
        timestamp: new Date(),
        tokens: 0,
        speed: 0
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex-1 overflow-y-auto space-y-6 p-4 rounded-3xl bg-slate-900/40 backdrop-blur-lg custom-scrollbar">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-3xl p-5 backdrop-blur-md transition-all duration-300 ${
                message.sender === 'user'
                  ? 'bg-gradient-to-r from-blue-600/40 to-cyan-600/40 border border-blue-500/50 rounded-br-none'
                  : 'bg-slate-800/60 border border-slate-700/50 rounded-bl-none'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  message.sender === 'user' 
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500' 
                    : 'bg-gradient-to-br from-cyan-500 to-blue-500 shadow-inner'
                }`}>
                  <span className="text-white font-bold text-sm">
                    {message.sender === 'user' ? 'U' : 'M'}
                  </span>
                </div>
                <span className="font-semibold text-slate-200">
                  {message.sender === 'user' ? 'Te' : 'Mia'}
                </span>
                <span className="text-xs text-slate-400">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="pl-11 overflow-hidden">
                <MarkdownResponse content={message.content} />
              </div>

              {message.sender === 'mia' && message.tokens !== undefined && (
                <div className="mt-3 pl-11 flex justify-end items-center space-x-3 text-xs text-slate-400 border-t border-slate-700/30 pt-2">
                  {message.speed !== undefined && (
                    <div className="flex items-center space-x-1 bg-slate-700/30 px-2 py-1 rounded-full backdrop-blur-sm">
                      <Zap className="w-3 h-3 text-yellow-400" />
                      <span>{message.speed.toFixed(1)} tok/s</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1 bg-slate-700/30 px-2 py-1 rounded-full backdrop-blur-sm">
                    <Cpu className="w-3 h-3 text-cyan-400" />
                    <span>{message.tokens} token</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-3xl p-4 flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              <span className="text-sm text-slate-400 animate-pulse font-mono">Mia éppen válaszol...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-4 p-2 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
        <div className="flex items-center space-x-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={isLoading ? "Mia is thinking..." : "Ask Mia something..."}
            disabled={isLoading}
            className="flex-1 p-2 px-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300 resize-none text-sm disabled:opacity-50"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 flex items-center space-x-2 h-fit ${
              inputText.trim() && !isLoading
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/20 active:scale-95'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
            }`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{isLoading ? '...' : 'Send'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;