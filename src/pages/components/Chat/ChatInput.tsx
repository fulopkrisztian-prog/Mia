import React, { useRef, useEffect } from 'react';
import { Send, Loader2, Paperclip, X, FileText, Brain, ShieldCheck, Sparkles, Globe } from 'lucide-react';
import { MiaMode } from '../../../types/chat';

interface ChatInputProps {
  inputText: string;
  setInputText: (val: string) => void;
  isLoading: boolean;
  miaMode: MiaMode;
  onModeChange: (mode: MiaMode) => void;
  attachedFile: { name: string; content: string } | null;
  setAttachedFile: (file: any) => void;
  onAttach: () => void;
  onSend: () => void;
}

const MODES = [
  { id: 'Auto' as MiaMode, icon: Brain, label: 'Auto' },
  { id: 'Basic' as MiaMode, icon: ShieldCheck, label: 'Basic' },
  { id: 'Philosophy' as MiaMode, icon: Sparkles, label: 'Philo' },
  { id: 'Search' as MiaMode, icon: Globe, label: 'Search' },
];

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText, setInputText, isLoading, miaMode, onModeChange, attachedFile, setAttachedFile, onAttach, onSend
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputText]);

  return (
    <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-white/5 bg-slate-900/40">
      <div className="flex items-center space-x-1.5 mb-2">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
              miaMode === mode.id ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <mode.icon className="w-3 h-3" />
            <span>{mode.label}</span>
          </button>
        ))}
      </div>

      {attachedFile && (
        <div className="flex items-center space-x-2 mb-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs text-blue-300 truncate flex-1">{attachedFile.name}</span>
          <button onClick={() => setAttachedFile(null)} className="p-0.5 text-blue-400 hover:text-red-400"><X className="w-3 h-3" /></button>
        </div>
      )}

      <div className="flex items-end space-x-2 bg-slate-800/60 border border-white/8 rounded-2xl px-3 py-2">
        <button onClick={onAttach} className="p-1.5 text-slate-500 hover:text-slate-300 mb-0.5"><Paperclip className="w-4 h-4" /></button>
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder={attachedFile ? `Kérdezz a(z) ${attachedFile.name} fájlról...` : 'Kérdezz bármit Miától...'}
          className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-600 resize-none py-1 text-sm max-h-40 custom-scrollbar"
          rows={1}
          disabled={isLoading}
        />
        <button onClick={onSend} disabled={(!inputText.trim() && !attachedFile) || isLoading} className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-lg">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};