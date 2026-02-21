import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Menu, Trash2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

import { Message, ChatEntry, MiaMode, MiaResponse } from '../types/chat';
import { ChatSidebar } from './components/Chat/ChatSidebar';
import { ChatInput } from './components/Chat/ChatInput';
import { MessageItem } from './components/Chat/MessageItem';
import SettingsPage from './components/UI/Settings';

const VRMViewer = lazy(() => import('./components/UI/VRMViewer').then((m) => ({ default: m.VRMViewer })));

const ChatWindow = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<ChatEntry[]>([]);
  const [activeChatId, setActiveChatId] = useState('');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [miaMode, setMiaMode] = useState<MiaMode>('Auto');
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mood, setMood] = useState<'idle' | 'thinking' | 'speaking' | 'scared'>('idle');
  const [chatToDelete, setChatToDelete] = useState<ChatEntry | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchChats(true); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (isLoading) return;
    const interval = setInterval(() => {
      setMood((current) => {
        if (current !== 'idle') return current;
        const moods: ('thinking' | 'speaking' | 'scared')[] = ['thinking', 'speaking', 'scared'];
        const randomMood = moods[Math.floor(Math.random() * moods.length)];
        setMood(randomMood);
        setTimeout(() => setMood('idle'), 2000);
        return randomMood;
      });
    }, 5000 + Math.random() * 10000);
    return () => clearInterval(interval);
  }, [isLoading]);

  const fetchChats = async (shouldLoadActive = false) => {
    try {
      const allChats: ChatEntry[] = await invoke('get_all_chats');
      setChats(allChats);
      if (shouldLoadActive && allChats.length > 0 && !activeChatId) handleSwitchChat(allChats[0].id);
    } catch (err) { console.error(err); }
  };

  const handleModeChange = async (newMode: MiaMode) => {
    setMiaMode(newMode);
    try { await invoke('set_mia_mode', { mode: newMode }); } catch (err) { console.error(err); }
  };

  const handleNewChat = async () => {
    try {
      const newId: string = await invoke('create_new_chat');
      setActiveChatId(newId);
      setMessages([{ id: 'welcome', content: "Hi! I'm Mia. How can I assist you today?", sender: 'mia', timestamp: new Date() }]);
      await fetchChats();
      setIsSidebarOpen(false);
      setMood('idle');
    } catch (err) { console.error(err); }
  };

  const handleSwitchChat = async (id: string) => {
    try {
      await invoke('switch_chat', { chatId: id });
      setActiveChatId(id);
      const history: any[] = await invoke('get_chat_history', { chatId: id });
      setMessages(history.map((m, i) => ({
        id: `${id}-${i}`,
        content: m.content,
        sender: m.role === 'user' ? 'user' : 'mia',
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        sources: m.sources,
      })));
      setIsSidebarOpen(false);
      setMood('idle');
    } catch (err) { console.error(err); }
  };

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const chat = chats.find(c => c.id === id);
    if (!chat) return;
    setChatToDelete(chat);
  };

  const confirmDeleteChat = async () => {
    if (!chatToDelete) return;
    try {
      await invoke('delete_chat', { chatId: chatToDelete.id });
      if (chatToDelete.id === activeChatId) {
        setMessages([]);
        setActiveChatId('');
      }
      await fetchChats(true);
    } catch (err) {
      console.error(err);
    } finally {
      setChatToDelete(null);
    }
  };

  const cancelDeleteChat = () => setChatToDelete(null);

  const handleAttachFile = async () => {
    try {
      const selected = await open({ multiple: false, filters: [{ name: 'Dokumentumok', extensions: ['pdf', 'docx', 'txt'] }] });
      if (selected && typeof selected === 'string') {
        const fileContent: string = await invoke('upload_file', { path: selected });
        setAttachedFile({ name: selected.split('\\').pop() || 'fájl', content: fileContent });
      }
    } catch (err) { console.error(err); }
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !attachedFile) || isLoading) return;
    const fullPrompt = attachedFile ? `${attachedFile.content}\n\nKérdés: ${inputText}` : inputText;

    setMessages(prev => [...prev, { id: Date.now(), content: attachedFile ? `📄 ${attachedFile.name}\n${inputText}` : inputText, sender: 'user', timestamp: new Date() }]);
    setInputText('');
    setAttachedFile(null);
    setIsLoading(true);
    setMood('thinking');

    try {
      const response: MiaResponse = await invoke('ask_mia', { message: fullPrompt });

      const scaredKeywords = ['ijesztő', 'félelmetes', 'halál', 'veszély', 'szörnyű', 'rettenetes'];
      const isScary = scaredKeywords.some(kw => response.content.toLowerCase().includes(kw));

      setMood(isScary ? 'scared' : 'speaking');

      setMessages(prev => [...prev, { id: Date.now() + 1, content: response.content, sender: 'mia', timestamp: new Date(), tokens: response.tokens, speed: response.speed, sources: response.sources }]);

      setTimeout(() => setMood('idle'), 2000);

      await fetchChats();
    } catch (err) {
      console.error(err);
      setMood('idle');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950">
      <aside className="hidden md:block w-64 flex-shrink-0 border-r border-white/5">
        <ChatSidebar
          chats={chats}
          activeChatId={activeChatId}
          onNewChat={handleNewChat}
          onSwitchChat={handleSwitchChat}
          onDeleteChat={handleDeleteChat}
          onOpenSettings={() => setShowSettings(true)}
        />
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="md:hidden flex items-center p-3 border-b border-white/5 bg-slate-900/60">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2">
            <Menu className="w-4 h-4 text-slate-400" />
          </button>
          <span className="text-sm font-semibold truncate flex-1">
            {chats.find(c => c.id === activeChatId)?.name ?? 'Mia'}
          </span>
        </div>

        {showSettings ? (
          <SettingsPage onBack={() => setShowSettings(false)} />
        ) : (
          <>
            <div className="md:hidden flex justify-center py-2 border-b border-white/5 bg-slate-900/40">
              <Suspense fallback={<div className="w-full h-48 bg-slate-900/60 animate-pulse rounded" />}>
                <VRMViewer mood={mood} />
              </Suspense>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 custom-scrollbar">
              {messages.map((msg) => (
                <MessageItem key={msg.id} message={msg} />
              ))}
              {isLoading && (
                <div className="text-xs text-slate-500 animate-pulse px-4">Mia gondolkodik...</div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <ChatInput
              inputText={inputText}
              setInputText={setInputText}
              isLoading={isLoading}
              miaMode={miaMode}
              onModeChange={handleModeChange}
              attachedFile={attachedFile}
              setAttachedFile={setAttachedFile}
              onAttach={handleAttachFile}
              onSend={handleSend}
            />
          </>
        )}
      </div>

      <aside className="hidden md:block w-80 flex-shrink-0 border-l border-white/5">
        <Suspense fallback={<div className="w-full h-full min-h-[320px] bg-slate-900/60 animate-pulse" />}>
          <VRMViewer mood={mood} />
        </Suspense>
      </aside>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 shadow-xl">
            <ChatSidebar
              chats={chats}
              activeChatId={activeChatId}
              onNewChat={handleNewChat}
              onSwitchChat={handleSwitchChat}
              onDeleteChat={handleDeleteChat}
              onOpenSettings={() => {
                setShowSettings(true);
                setIsSidebarOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {chatToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={cancelDeleteChat}
        >
          <div
            className="w-[90%] max-w-sm rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl shadow-black/40 p-5 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-white">
                  Beszélgetés törlése?
                </h2>
                <p className="text-xs text-slate-400">
                  Biztosan törlöd a(z){' '}
                  <span className="font-medium text-slate-200">
                    {chatToDelete.name}
                  </span>{' '}
                  beszélgetést? Ez a művelet nem vonható vissza.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button
                onClick={cancelDeleteChat}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={confirmDeleteChat}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md shadow-red-500/30 hover:brightness-110 transition-all"
              >
                Törlés
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;