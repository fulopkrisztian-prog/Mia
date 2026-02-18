import React from 'react';
import { Plus, MessageSquare, Trash2, Settings } from 'lucide-react';
import { ChatEntry } from '../../../types/chat';

interface ChatSidebarProps {
  chats: ChatEntry[];
  activeChatId: string;
  onNewChat: () => void;
  onSwitchChat: (id: string) => void;
  onDeleteChat: (e: React.MouseEvent, id: string) => void;
  onOpenSettings: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats, activeChatId, onNewChat, onSwitchChat, onDeleteChat, onOpenSettings
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-900/60 border-r border-white/5">
      <div className="p-4 border-b border-white/5">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Új beszélgetés</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {chats.length === 0 && (
          <p className="text-center text-slate-600 text-xs mt-8 px-4">Még nincs beszélgetés</p>
        )}
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSwitchChat(chat.id)}
            className={`w-full flex items-center space-x-2 p-3 rounded-xl transition-all duration-200 group text-left ${
              activeChatId === chat.id
                ? 'bg-blue-500/20 text-white border border-blue-500/30'
                : 'hover:bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
            <span className="flex-1 text-xs truncate">{chat.name}</span>
            <span
              onClick={(e) => onDeleteChat(e, chat.id)}
              className="p-1 rounded-md hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-3 h-3" />
            </span>
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-white/5">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white transition-all text-xs"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Beállítások</span>
        </button>
        <p className="text-center text-slate-600 text-[10px] mt-2">v1.5.1 Mia Neural</p>
      </div>
    </div>
  );
};