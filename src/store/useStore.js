import { create } from 'zustand';
import { DEFAULT_VOCAB } from '../data/defaultVocab';
import { getNextInterval } from '../utils/srs';
import {
  getStoredApiKey,
  saveApiKey,
  loadStoredChatHistory,
  saveStoredChatHistory,
  loadStoredChatSessions,
  saveStoredChatSessions,
  formatSessionTitle,
  getActiveConfig,
  setActiveConfig,
} from '../services/geminiService';

const LOCAL_KEY = 'vocab_progress_local';
const CUSTOM_WORDS_KEY = 'vocab_custom_words';
const LOCAL_EDITED_WORDS_KEY = 'vocab_edited_words';
const LOCAL_DELETED_WORDS_KEY = 'vocab_deleted_word_ids';

function loadLocalProgress() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
  } catch { return {}; }
}

function loadCustomWords() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_WORDS_KEY) || '[]');
  } catch { return []; }
}

function loadLocalEditedWords() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_EDITED_WORDS_KEY) || '{}');
  } catch { return {}; }
}

function loadLocalDeletedWordIds() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_DELETED_WORDS_KEY) || '[]');
  } catch { return []; }
}

function saveLocalProgress(progress) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(progress));
}

function saveCustomWords(words) {
  localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(words));
}

function saveLocalEditedWords(editedWords) {
  localStorage.setItem(LOCAL_EDITED_WORDS_KEY, JSON.stringify(editedWords));
}

function saveLocalDeletedWordIds(deletedWordIds) {
  localStorage.setItem(LOCAL_DELETED_WORDS_KEY, JSON.stringify(deletedWordIds));
}

// Initial word state
function initWordState() {
  return {
    status: 'unseen', // 'unseen' | 'learning' | 'mastered'
    correctStreak: 0, // 0, 1, or 2 (needs 2 for mastered)
    srsStage: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
  };
}

const initialSessions = loadStoredChatSessions();

export const useStore = create((set, get) => ({
  // ─── Auth ───────────────────────────────────────────
  user: null,
  setUser: (user) => set({ user }),

  // ─── Vocabulary ─────────────────────────────────────
  customWords: loadCustomWords(),
  editedWords: loadLocalEditedWords(),
  deletedWordIds: loadLocalDeletedWordIds(),
  progress: loadLocalProgress(), // { wordId: { status, correctStreak, srsStage, lastReviewedAt, nextReviewAt } }

  // ─── AI Tutor & Gemini ──────────────────────────────
  geminiApiKey: getStoredApiKey(),
  geminiModelConfig: getActiveConfig(),
  chatSessions: initialSessions,
  activeSessionId: initialSessions.length > 0 ? initialSessions[0].id : null,
  aiChatHistory: initialSessions.length > 0 ? (initialSessions[0].messages || []) : loadStoredChatHistory(),

  setGeminiModelConfig: (config) => {
    if (config?.model) {
      setActiveConfig(config.model, config.apiVersion || 'v1');
    }
    set({ geminiModelConfig: config });
    const { firestoreSave, progress, customWords, geminiApiKey, aiChatHistory, user, editedWords, deletedWordIds, chatSessions } = get();
    if (user && firestoreSave) {
      firestoreSave(progress, customWords, geminiApiKey, aiChatHistory, config, editedWords, deletedWordIds, chatSessions);
    }
  },

  setGeminiApiKey: (key) => {
    const cleanKey = (key || '').trim();
    saveApiKey(cleanKey);
    set({ geminiApiKey: cleanKey });
    const { firestoreSave, progress, customWords, aiChatHistory, geminiModelConfig, user, editedWords, deletedWordIds, chatSessions } = get();
    if (user && firestoreSave) {
      firestoreSave(progress, customWords, cleanKey, aiChatHistory, geminiModelConfig, editedWords, deletedWordIds, chatSessions);
    }
  },

  setChatSessions: (sessions) => {
    const list = Array.isArray(sessions) ? sessions : [];
    saveStoredChatSessions(list);
    let nextActiveId = get().activeSessionId;
    if (nextActiveId && !list.some(s => s.id === nextActiveId)) {
      nextActiveId = list.length > 0 ? list[0].id : null;
    } else if (!nextActiveId && list.length > 0) {
      nextActiveId = list[0].id;
    }
    const activeSession = list.find(s => s.id === nextActiveId);
    const activeMessages = activeSession ? activeSession.messages : [];
    set({
      chatSessions: list,
      activeSessionId: nextActiveId,
      aiChatHistory: activeMessages,
    });
    const { firestoreSave, progress, customWords, geminiApiKey, geminiModelConfig, editedWords, deletedWordIds } = get();
    if (firestoreSave) {
      firestoreSave(
        progress,
        customWords,
        geminiApiKey,
        activeMessages,
        geminiModelConfig,
        editedWords,
        deletedWordIds,
        list
      );
    }
  },

  setActiveSessionId: (id) => {
    const { chatSessions } = get();
    const session = chatSessions.find(s => s.id === id);
    const messages = session ? session.messages : [];
    set({
      activeSessionId: id,
      aiChatHistory: messages,
    });
  },

  createChatSession: (initialMessage, customTitle) => {
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sessionTitle = (customTitle || '').trim() || formatSessionTitle(new Date());
    const messages = initialMessage ? [initialMessage] : [];
    const newSession = {
      id: newId,
      title: sessionTitle,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages,
    };
    set(state => {
      const updatedSessions = [newSession, ...(state.chatSessions || [])];
      saveStoredChatSessions(updatedSessions);
      if (state.firestoreSave) {
        state.firestoreSave(
          state.progress,
          state.customWords,
          state.geminiApiKey,
          messages,
          state.geminiModelConfig,
          state.editedWords,
          state.deletedWordIds,
          updatedSessions
        );
      }
      return {
        chatSessions: updatedSessions,
        activeSessionId: newId,
        aiChatHistory: messages,
      };
    });
    return newSession;
  },

  deleteChatSession: (id) => {
    set(state => {
      const filtered = (state.chatSessions || []).filter(s => s.id !== id);
      saveStoredChatSessions(filtered);
      let nextActiveId = state.activeSessionId;
      if (state.activeSessionId === id) {
        nextActiveId = filtered.length > 0 ? filtered[0].id : null;
      }
      const nextSession = filtered.find(s => s.id === nextActiveId);
      const nextMessages = nextSession ? nextSession.messages : [];
      if (state.firestoreSave) {
        state.firestoreSave(
          state.progress,
          state.customWords,
          state.geminiApiKey,
          nextMessages,
          state.geminiModelConfig,
          state.editedWords,
          state.deletedWordIds,
          filtered
        );
      }
      return {
        chatSessions: filtered,
        activeSessionId: nextActiveId,
        aiChatHistory: nextMessages,
      };
    });
  },

  updateActiveSessionMessages: (messagesOrUpdater) => {
    set(state => {
      const activeId = state.activeSessionId;
      if (!activeId) return {};
      const currentSession = (state.chatSessions || []).find(s => s.id === activeId);
      const currentMessages = currentSession?.messages || [];
      const newMessages = typeof messagesOrUpdater === 'function'
        ? messagesOrUpdater(currentMessages)
        : messagesOrUpdater;
      const trimmed = Array.isArray(newMessages) ? newMessages.slice(-50) : [];
      const updatedSessions = (state.chatSessions || []).map(s => {
        if (s.id === activeId) {
          return {
            ...s,
            messages: trimmed,
            updatedAt: Date.now(),
          };
        }
        return s;
      });
      saveStoredChatSessions(updatedSessions);
      if (state.firestoreSave) {
        state.firestoreSave(
          state.progress,
          state.customWords,
          state.geminiApiKey,
          trimmed,
          state.geminiModelConfig,
          state.editedWords,
          state.deletedWordIds,
          updatedSessions
        );
      }
      return {
        chatSessions: updatedSessions,
        aiChatHistory: trimmed,
      };
    });
  },

  setAiChatHistory: (messages) => {
    const trimmed = Array.isArray(messages) ? messages.slice(-50) : [];
    saveStoredChatHistory(trimmed);
    const { activeSessionId } = get();
    if (activeSessionId) {
      get().updateActiveSessionMessages(trimmed);
    } else {
      set({ aiChatHistory: trimmed });
    }
  },

  getAllWords: () => {
    const { customWords, editedWords, deletedWordIds } = get();
    const deletedSet = new Set(deletedWordIds || []);

    const processedDefaults = DEFAULT_VOCAB
      .filter(w => !deletedSet.has(w.id))
      .map(w => (editedWords[w.id] ? { ...w, ...editedWords[w.id] } : w));

    const processedCustom = customWords
      .filter(w => !deletedSet.has(w.id))
      .map(w => (editedWords[w.id] ? { ...w, ...editedWords[w.id] } : w));

    return [...processedDefaults, ...processedCustom];
  },

  getWordState: (id) => {
    const { progress } = get();
    return progress[id] || initWordState();
  },

  // ─── Settings ───────────────────────────────────────
  srsMode: 'standard',
  setSrsMode: (mode) => set({ srsMode: mode }),

  interleaveMode: 'balanced',
  setInterleaveMode: (mode) => set({ interleaveMode: mode }),

  showMeaningFirst: true, // true = auto-show meaning | false = flip card
  setShowMeaningFirst: (v) => set({ showMeaningFirst: v }),

  topicFilter: 'all',
  setTopicFilter: (t) => set({ topicFilter: t }),

  // ─── Firestore sync handler (set by App.jsx) ─────────
  firestoreSave: null,
  setFirestoreSave: (fn) => set({ firestoreSave: fn }),

  // ─── History log ────────────────────────────────────
  history: [],
  addHistory: (entry) => set(state => ({
    history: [entry, ...state.history].slice(0, 6),
  })),

  // ─── Stats ──────────────────────────────────────────
  sessionCorrect: 0,
  sessionTotal: 0,
  addQuizResult: (correct) => set(state => ({
    sessionCorrect: state.sessionCorrect + (correct ? 1 : 0),
    sessionTotal: state.sessionTotal + 1,
  })),

  // ─── Core progress actions ───────────────────────────
  updateWordState: (id, updates) => {
    set(state => {
      const newProgress = {
        ...state.progress,
        [id]: { ...(state.progress[id] || initWordState()), ...updates },
      };
      saveLocalProgress(newProgress);
      // Trigger Firestore save if logged in
      if (state.firestoreSave) {
        state.firestoreSave(
          newProgress,
          state.customWords,
          state.geminiApiKey,
          state.aiChatHistory,
          state.geminiModelConfig,
          state.editedWords,
          state.deletedWordIds,
          state.chatSessions
        );
      }
      return { progress: newProgress };
    });
  },

  markSeen: (id) => {
    const { getWordState, updateWordState, addHistory, getAllWords } = get();
    const ws = getWordState(id);
    const word = getAllWords().find(w => w.id === id);
    if (ws.status === 'unseen') {
      updateWordState(id, { status: 'learning', lastReviewedAt: Date.now() });
      addHistory({ type: 'seen', word: word?.word || id, time: Date.now() });
    }
  },

  markLearning: (id) => {
    const { getWordState, updateWordState, addHistory, getAllWords } = get();
    const ws = getWordState(id);
    const word = getAllWords().find(w => w.id === id);
    if (ws.status !== 'mastered') {
      updateWordState(id, {
        status: 'learning',
        correctStreak: 0,
        lastReviewedAt: Date.now(),
      });
      addHistory({ type: 'seen', word: word?.word || id, time: Date.now() });
    }
  },

  markMastered: (id) => {
    const { getWordState, updateWordState, srsMode, addHistory, getAllWords } = get();
    const ws = getWordState(id);
    const word = getAllWords().find(w => w.id === id);
    const newStage = Math.min((ws.srsStage || 0) + 1, 5);
    const interval = getNextInterval(newStage, srsMode);
    updateWordState(id, {
      status: 'mastered',
      correctStreak: 2,
      srsStage: newStage,
      lastReviewedAt: Date.now(),
      nextReviewAt: Date.now() + interval,
    });
    addHistory({ type: 'mastered', word: word?.word || id, time: Date.now() });
  },

  handleQuizAnswer: (wordId, correct) => {
    const { getWordState, updateWordState, markMastered, addHistory, getAllWords, addQuizResult } = get();
    const ws = getWordState(wordId);
    const word = getAllWords().find(w => w.id === wordId);
    addQuizResult(correct);

    if (correct) {
      const newStreak = (ws.correctStreak || 0) + 1;
      if (newStreak >= 2) {
        markMastered(wordId);
      } else {
        updateWordState(wordId, {
          correctStreak: newStreak,
          lastReviewedAt: Date.now(),
        });
        addHistory({ type: 'correct', streak: newStreak, word: word?.word || wordId, time: Date.now() });
      }
    } else {
      // Wrong: reset streak, keep in learning, maybe demote SRS
      const newStage = Math.max((ws.srsStage || 0) - 1, 0);
      updateWordState(wordId, {
        correctStreak: 0,
        srsStage: newStage,
        lastReviewedAt: Date.now(),
        status: 'learning',
        nextReviewAt: null,
      });
      addHistory({ type: 'wrong', word: word?.word || wordId, time: Date.now() });
    }
  },

  // SRS check: move mastered words back to learning if due
  checkSrsReview: () => {
    const { progress, updateWordState } = get();
    const now = Date.now();
    Object.entries(progress).forEach(([id, ws]) => {
      if (ws.status === 'mastered' && ws.nextReviewAt && ws.nextReviewAt <= now) {
        updateWordState(id, {
          status: 'learning',
          correctStreak: 1, // only needs 1 more correct
        });
      }
    });
  },

  // ─── Custom words & Word Modifications ───────────────
  addCustomWords: (words) => {
    set(state => {
      const newCustom = [...state.customWords, ...words];
      saveCustomWords(newCustom);
      if (state.firestoreSave) {
        state.firestoreSave(
          state.progress,
          newCustom,
          state.geminiApiKey,
          state.aiChatHistory,
          state.geminiModelConfig,
          state.editedWords,
          state.deletedWordIds,
          state.chatSessions
        );
      }
      return { customWords: newCustom };
    });
  },

  updateWord: (id, updatedFields) => {
    set(state => {
      const currentEdited = state.editedWords || {};
      const newEdited = {
        ...currentEdited,
        [id]: { ...(currentEdited[id] || {}), ...updatedFields },
      };
      saveLocalEditedWords(newEdited);

      // If it is in customWords, update customWords directly
      let newCustom = state.customWords;
      if (state.customWords.some(w => w.id === id)) {
        newCustom = state.customWords.map(w => (w.id === id ? { ...w, ...updatedFields } : w));
        saveCustomWords(newCustom);
      }

      if (state.firestoreSave) {
        state.firestoreSave(
          state.progress,
          newCustom,
          state.geminiApiKey,
          state.aiChatHistory,
          state.geminiModelConfig,
          newEdited,
          state.deletedWordIds,
          state.chatSessions
        );
      }

      return {
        editedWords: newEdited,
        customWords: newCustom,
      };
    });
  },

  deleteWord: (id) => {
    set(state => {
      const currentDeleted = state.deletedWordIds || [];
      const newDeleted = currentDeleted.includes(id) ? currentDeleted : [...currentDeleted, id];
      saveLocalDeletedWordIds(newDeleted);

      const newCustom = (state.customWords || []).filter(w => w.id !== id);
      saveCustomWords(newCustom);

      const newProgress = { ...state.progress };
      delete newProgress[id];
      saveLocalProgress(newProgress);

      const newEdited = { ...(state.editedWords || {}) };
      delete newEdited[id];
      saveLocalEditedWords(newEdited);

      if (state.firestoreSave) {
        state.firestoreSave(
          newProgress,
          newCustom,
          state.geminiApiKey,
          state.aiChatHistory,
          state.geminiModelConfig,
          newEdited,
          newDeleted,
          state.chatSessions
        );
      }

      return {
        deletedWordIds: newDeleted,
        customWords: newCustom,
        progress: newProgress,
        editedWords: newEdited,
      };
    });
  },

  deleteCustomWord: (id) => {
    get().deleteWord(id);
  },

  restoreAllDefaults: () => {
    set(state => {
      const defaultIds = new Set(DEFAULT_VOCAB.map(w => w.id));
      const newDeleted = (state.deletedWordIds || []).filter(id => !defaultIds.has(id));
      const newEdited = { ...(state.editedWords || {}) };
      defaultIds.forEach(id => {
        delete newEdited[id];
      });

      saveLocalDeletedWordIds(newDeleted);
      saveLocalEditedWords(newEdited);

      if (state.firestoreSave) {
        state.firestoreSave(
          state.progress,
          state.customWords,
          state.geminiApiKey,
          state.aiChatHistory,
          state.geminiModelConfig,
          newEdited,
          newDeleted,
          state.chatSessions
        );
      }

      return {
        deletedWordIds: newDeleted,
        editedWords: newEdited,
      };
    });
  },

  resetProgress: () => {
    set(state => {
      const newProgress = {};
      saveLocalProgress(newProgress);
      if (state.firestoreSave) {
        state.firestoreSave(
          newProgress,
          state.customWords,
          state.geminiApiKey,
          state.aiChatHistory,
          state.geminiModelConfig,
          state.editedWords,
          state.deletedWordIds,
          state.chatSessions
        );
      }
      return { progress: newProgress, sessionCorrect: 0, sessionTotal: 0, history: [] };
    });
  },

  loadFromFirestore: (data) => {
    if (!data) return;
    const {
      progress,
      customWords,
      geminiApiKey,
      aiChatHistory,
      aiChatSessions,
      geminiModelConfig,
      editedWords,
      deletedWordIds,
    } = data;
    if (progress) {
      saveLocalProgress(progress);
    }
    if (customWords) {
      saveCustomWords(customWords);
    }
    if (editedWords && typeof editedWords === 'object') {
      saveLocalEditedWords(editedWords);
    }
    if (Array.isArray(deletedWordIds)) {
      saveLocalDeletedWordIds(deletedWordIds);
    }
    const updates = {
      progress: progress || {},
      customWords: customWords || [],
    };
    if (editedWords && typeof editedWords === 'object') {
      updates.editedWords = editedWords;
    }
    if (Array.isArray(deletedWordIds)) {
      updates.deletedWordIds = deletedWordIds;
    }
    if (typeof geminiApiKey === 'string' && geminiApiKey.trim()) {
      saveApiKey(geminiApiKey.trim());
      updates.geminiApiKey = geminiApiKey.trim();
    }
    if (geminiModelConfig?.model) {
      setActiveConfig(geminiModelConfig.model, geminiModelConfig.apiVersion || 'v1');
      updates.geminiModelConfig = geminiModelConfig;
    }

    if (Array.isArray(aiChatSessions) && aiChatSessions.length > 0) {
      saveStoredChatSessions(aiChatSessions);
      updates.chatSessions = aiChatSessions;
      const currentActive = get().activeSessionId;
      if (!currentActive || !aiChatSessions.some(s => s.id === currentActive)) {
        updates.activeSessionId = aiChatSessions[0].id;
      }
      const activeSession = aiChatSessions.find(s => s.id === (updates.activeSessionId || currentActive)) || aiChatSessions[0];
      updates.aiChatHistory = activeSession?.messages || [];
      saveStoredChatHistory(updates.aiChatHistory);
    } else if (Array.isArray(aiChatHistory) && aiChatHistory.length > 0) {
      saveStoredChatHistory(aiChatHistory);
      updates.aiChatHistory = aiChatHistory;
      if (!get().chatSessions || get().chatSessions.length === 0) {
        const fallbackSession = {
          id: `session_${Date.now()}_legacy`,
          title: formatSessionTitle(new Date()),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: aiChatHistory.slice(-50),
        };
        saveStoredChatSessions([fallbackSession]);
        updates.chatSessions = [fallbackSession];
        updates.activeSessionId = fallbackSession.id;
      }
    }

    set(updates);
  },

  // ─── Google Sheets import ─────────────────────────────
  sheetsUrl: localStorage.getItem('vocab_sheets_url') || '',
  setSheetsUrl: (url) => {
    localStorage.setItem('vocab_sheets_url', url);
    set({ sheetsUrl: url });
  },
}));
