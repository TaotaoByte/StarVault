import { create } from 'zustand';
import type { DatabaseAdapter, Item } from '@starvault/core';

export interface AppState {
  db: DatabaseAdapter | null;
  items: Item[];
  isSyncing: boolean;
  githubToken: string;
  searchQuery: string;
  setDb: (db: DatabaseAdapter) => void;
  setItems: (items: Item[]) => void;
  addItem: (item: Item) => void;
  setIsSyncing: (value: boolean) => void;
  setGithubToken: (token: string) => void;
  setSearchQuery: (query: string) => void;
}

export const useAppStore = create<AppState>(set => ({
  db: null,
  items: [],
  isSyncing: false,
  githubToken: localStorage.getItem('sv-github-token') ?? '',
  searchQuery: '',
  setDb: db => set({ db }),
  setItems: items => set({ items }),
  addItem: item => set(state => ({ items: [item, ...state.items] })),
  setIsSyncing: value => set({ isSyncing: value }),
  setGithubToken: token => {
    localStorage.setItem('sv-github-token', token);
    set({ githubToken: token });
  },
  setSearchQuery: query => set({ searchQuery: query }),
}));
