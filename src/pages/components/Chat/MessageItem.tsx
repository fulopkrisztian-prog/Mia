import React from 'react';
import { Zap, Hash, Globe, ExternalLink } from 'lucide-react';
import { Message } from '../../../types/chat';
import MarkdownResponse from '../UI/MarkdownResponse';
import { openUrl } from '@tauri-apps/plugin-opener';

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center space-x-2 mb-1 px-1">
          <span className="text-[10px] text-slate-500 font-medium">
            {isUser ? 'Te' : 'Mia'}
          </span>
          <span className="text-[10px] text-slate-600">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${
          isUser
            ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-tr-sm'
            : 'bg-slate-800/80 border border-white/5 text-slate-200 rounded-tl-sm'
        }`}>
          {!isUser ? (
            <MarkdownResponse content={message.content} />
          ) : (
            <span className="whitespace-pre-wrap">{message.content}</span>
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 w-full">
            <div className="flex flex-wrap gap-1.5">
              {message.sources.map((source, sIdx) => (
                <button
                  key={sIdx}
                  onClick={async () => {
                    try { await openUrl(source.url); } catch (e) { console.error(e); }
                  }}
                  className="flex items-center space-x-1.5 bg-slate-800/60 hover:bg-blue-600/20 border border-slate-700/50 hover:border-blue-500/40 px-2.5 py-1 rounded-lg transition-all text-xs text-slate-400 hover:text-slate-200"
                >
                  <Globe className="w-3 h-3 flex-shrink-0 text-blue-400" />
                  <span className="truncate max-w-[140px]">{source.title}</span>
                  <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-50" />
                </button>
              ))}
            </div>
          </div>
        )}

        {!isUser && message.speed !== undefined && (
          <div className="flex items-center space-x-3 mt-1.5 px-1">
            <span className="text-[10px] text-slate-600 flex items-center space-x-1">
              <Zap className="w-2.5 h-2.5" />
              <span>{message.speed.toFixed(1)} tok/s</span>
            </span>
            <span className="text-[10px] text-slate-600 flex items-center space-x-1">
              <Hash className="w-2.5 h-2.5" />
              <span>{message.tokens} token</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};