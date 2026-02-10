import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'mia';
  timestamp: Date;
}

const ChatWindow = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, content: "Hello! I'm Mia, your AI assistant. How can I help you today?", sender: 'mia', timestamp: new Date() },
  ]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      content: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    setTimeout(() => {
      const aiMessage: Message = {
        id: messages.length + 2,
        content: `I received: "${inputText}". This is a simulated response from Mia.`,
        sender: 'mia',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex-1 overflow-y-auto space-y-6 p-4 rounded-3xl bg-slate-900/40 backdrop-blur-lg">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-3xl p-5 backdrop-blur-md transition-all duration-300 ${
                message.sender === 'user'
                  ? 'bg-gradient-to-r from-indigo-600/40 to-violet-600/40 border border-indigo-500/50 rounded-br-none'
                  : 'bg-slate-800/60 border border-slate-700/50 rounded-bl-none'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  message.sender === 'user' 
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-500' 
                    : 'bg-gradient-to-br from-slate-700 to-slate-600'
                }`}>
                  <span className="text-white font-bold text-sm">
                    {message.sender === 'user' ? 'U' : 'M'}
                  </span>
                </div>
                <span className="font-semibold text-slate-200">
                  {message.sender === 'user' ? 'You' : 'Mia'}
                </span>
                <span className="text-xs text-slate-400">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-slate-100 leading-relaxed pl-11">{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
        <div className="mt-2 p-2 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30">
          <div className="flex items-center space-x-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Message Mia..."
              className="flex-1 p-2 px-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-300 resize-none text-sm"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-300 flex items-center space-x-2 h-fit ${
                inputText.trim()
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
  );
};

export default ChatWindow;