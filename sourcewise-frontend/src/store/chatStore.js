import { create } from 'zustand';

const WELCOME_MSG = {
  id: 1,
  role: 'assistant',
  content: "Hi! I'm **SourceWise AI** — running locally on your machine, no internet needed.\n\nUpload your study documents in **Sources**, select them on the left, then ask me anything. I'll answer with citations from your own material.",
  citations: [],
  timestamp: new Date().toISOString(),
};

function getChatKey(userId) {
  return userId ? `sourcewise_chat_${userId}` : 'sourcewise_chat_guest';
}

function getInitialChatData() {
  try {
    const rawAuth = localStorage.getItem('sourcewise-auth');
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth);
      const userId = parsed?.state?.user?.id;
      if (userId) {
        const raw = localStorage.getItem(getChatKey(userId));
        if (raw) {
          const parsedChat = JSON.parse(raw);
          return {
            userId,
            conversations: parsedChat.conversations || {
              default: {
                id: 'default',
                title: 'New Chat',
                messages: [WELCOME_MSG],
                createdAt: new Date().toISOString(),
              },
            },
            activeConversationId: parsedChat.activeConversationId || 'default',
          };
        }
        return { userId, conversations: null, activeConversationId: 'default' };
      }
    }
  } catch (_) {}
  return { userId: null, conversations: null, activeConversationId: 'default' };
}

const initial = getInitialChatData();

export const useChatStore = create(
  (set, get) => ({
    // User scoping
    _userId: initial.userId,

    // Slide-over panel (used by the FAB button)
    isOpen: false,
    chatSeed: '',
    toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),
    openChat: (seed = '') => set({ isOpen: true, chatSeed: typeof seed === 'string' ? seed : '' }),
    closeChat: () => set({ isOpen: false, chatSeed: '' }),
    setChatSeed: (seed) => set({ chatSeed: typeof seed === 'string' ? seed : '' }),

    // Conversations: { [conversationId]: { id, title, messages: [] } }
    conversations: initial.conversations || {
      default: {
        id: 'default',
        title: 'New Chat',
        messages: [WELCOME_MSG],
        createdAt: new Date().toISOString(),
      },
    },
    activeConversationId: initial.activeConversationId || 'default',

    _persistChat: () => {
      const { conversations, activeConversationId, _userId } = get();
      try {
        localStorage.setItem(
          getChatKey(_userId),
          JSON.stringify({ conversations, activeConversationId })
        );
      } catch (_) {}
    },

    initForUser: (userId) => {
      set({
        _userId: userId || null,
        conversations: {
          default: {
            id: 'default',
            title: 'New Chat',
            messages: [WELCOME_MSG],
            createdAt: new Date().toISOString(),
          },
        },
        activeConversationId: 'default',
      });

      if (userId) {
        try {
          const raw = localStorage.getItem(getChatKey(userId));
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.conversations) {
              set({
                conversations: parsed.conversations,
                activeConversationId: parsed.activeConversationId || 'default',
              });
            }
          }
        } catch (_) {}
      }
    },

    resetChat: () => {
      set({
        _userId: null,
        conversations: {
          default: {
            id: 'default',
            title: 'New Chat',
            messages: [WELCOME_MSG],
            createdAt: new Date().toISOString(),
          },
        },
        activeConversationId: 'default',
      });
      try {
        localStorage.removeItem('sourcewise-chat');
        localStorage.removeItem('sourcewise_chat_guest');
      } catch (_) {}
    },

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
      get()._persistChat();
    },

    switchConversation: (id) => {
      set({ activeConversationId: id });
      get()._persistChat();
    },

    deleteConversation: (id) => {
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
      });
      get()._persistChat();
    },

    addMessage: (message) => {
      set((s) => {
        const id = s.activeConversationId;
        const conv = s.conversations[id] || {
          id,
          title: 'New Chat',
          messages: [],
          createdAt: new Date().toISOString(),
        };
        const newMsg = { ...message, id: Date.now(), timestamp: new Date().toISOString() };
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
      });
      get()._persistChat();
    },

    updateLastMessage: (patch) => {
      set((s) => {
        const id = s.activeConversationId;
        const conv = s.conversations[id];
        if (!conv) return s;
        const msgs = [...conv.messages];
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...patch };
        return {
          conversations: {
            ...s.conversations,
            [id]: { ...conv, messages: msgs },
          },
        };
      });
      get()._persistChat();
    },

    clearActiveChat: () => {
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
      });
      get()._persistChat();
    },
  })
);
