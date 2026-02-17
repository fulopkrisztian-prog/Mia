export type MiaMode = 'Auto' | 'Basic' | 'Philosophy' | 'Search';

export interface WebSource {
  title: string;
  url: string;
}

export interface MiaResponse {
  content: string;
  tokens: number;
  speed: number;
  sources: WebSource[];
}

export interface Message {
  id: string | number;
  content: string;
  sender: 'user' | 'mia';
  timestamp: Date;
  tokens?: number;
  speed?: number;
  isSearch?: boolean;
  sources?: WebSource[];
}

export interface ChatEntry {
  id: string;
  name: string;
  last_active: number;
}