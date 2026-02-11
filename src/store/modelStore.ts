import { create } from 'zustand';

interface ModelStore {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useModelStore = create<ModelStore>((set) => ({
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
}));