import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const WELCOME_MSG = {
  id: 1,
  role: 'assistant',
  content: "Hi! I'm **SourceWise AI** — running locally on your machine, no internet needed.\n\nUpload your study documents in **Sources**, select them on the left, then ask me anything. I'll answer with citations from your own material.",
  citations: [],
  timestamp: new Date().toISOString(),
};

export const useChatStore = create(
  persist(
    (set, get) => ({
      // Slide-over panel (used by the FAB button)
      isOpen: false,
      chatSeed: '',
      toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),
      openChat: (seed = '') => set({ isOpen: true, chatSeed: typeof seed === 'string' ? seed : '' }),
      closeChat: () => set({ isOpen: false, chatSeed: '' }),
      setChatSeed: (seed) => set({ chatSeed: typeof seed === 'string' ? seed : '' }),

      // Conversations: { [conversationId]: { id, title, messages: [] } }
      conversations: {
        default: {
          id: 'default',
          title: 'New Chat',
          messages: [WELCOME_MSG],
          createdAt: new Date().toISOString(),
        },
      },
      activeConversationId: 'default',

      // ── Selectors ──────────────────────────────────────────────────────────

      getActiveMessages: () => {
        const { conversations, activeConversationId } = get();
        return conversations[activeConversationId]?.messages ?? [];
      },

      // ── Actions ────────────────────────────────────────────────────────────

      newConversation: () => {
        const id = `conv_${Date.now()}`;
        set((s) => ({
          conversations: {
            ...s.conversations,
            [id]: {
              id,
              title: 'New Chat',
              messages: [{ ...WELCOME_MSG, id: Date.now(), timestamp: new Date().toISOString() }],
              createdAt: new Date().toISOString(),
            },
          },
          activeConversationId: id,
        }));
      },

      switchConversation: (id) => set({ activeConversationId: id }),

      deleteConversation: (id) =>
        set((s) => {
          const convs = { ...s.conversations };
          delete convs[id];
          const remaining = Object.keys(convs);
          const newActive = remaining.length ? remaining[remaining.length - 1] : 'default';
          if (!remaining.length) {
            convs['default'] = {
              id: 'default',
              title: 'New Chat',
              messages: [{ ...WELCOME_MSG, timestamp: new Date().toISOString() }],
              createdAt: new Date().toISOString(),
            };
          }
          return { conversations: convs, activeConversationId: newActive };
        }),

      addMessage: (message) =>
        set((s) => {
          const id = s.activeConversationId;
          const conv = s.conversations[id];
          const newMsg = { ...message, id: Date.now(), timestamp: new Date().toISOString() };
          // Auto-title conversation from first user question
          const isFirstUser = conv.messages.filter((m) => m.role === 'user').length === 0 && message.role === 'user';
          return {
            conversations: {
              ...s.conversations,
              [id]: {
                ...conv,
                title: isFirstUser ? message.content.slice(0, 48) : conv.title,
                messages: [...conv.messages, newMsg],
              },
            },
          };
        }),

      updateLastMessage: (patch) =>
        set((s) => {
          const id = s.activeConversationId;
          const conv = s.conversations[id];
          const msgs = [...conv.messages];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...patch };
          return {
            conversations: {
              ...s.conversations,
              [id]: { ...conv, messages: msgs },
            },
          };
        }),

      clearActiveChat: () =>
        set((s) => {
          const id = s.activeConversationId;
          return {
            conversations: {
              ...s.conversations,
              [id]: {
                ...s.conversations[id],
                title: 'New Chat',
                messages: [{ ...WELCOME_MSG, id: Date.now(), timestamp: new Date().toISOString() }],
              },
            },
          };
        }),
    }),
    {
      name: 'sourcewise-chat',
      partialize: (s) => ({ conversations: s.conversations, activeConversationId: s.activeConversationId }),
    }
  )
);
