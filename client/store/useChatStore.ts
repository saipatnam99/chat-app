import { create } from "zustand";

interface ChatState {
  selectedChat: any;
  setSelectedChat: (chat: any) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  selectedChat: null,
  setSelectedChat: (chat) =>
    set({ selectedChat: chat }),
}));