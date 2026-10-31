import { create } from 'zustand';
import { DEFAULT_VOCAB } from '../data/defaultVocab';
import { getNextInterval } from '../utils/srs';
import {
  getStoredApiKey,
  saveApiKey,
  loadStoredChatHistory,
  saveStoredChatHistory,
} from '../services/geminiService';

const LOCAL_KEY = 'vocab_progress_local';
const CUSTOM_WORDS_KEY = 'vocab_custom_words';

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

function saveLocalProgress(progress) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(progress));
}

function saveCustomWords(words) {
  localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(words));
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

export const useStore = create((set, get) => ({
  // ─── Auth ───────────────────────────────────────────
  user: null,
  setUser: (user) => set({ user }),

  // ─── Vocabulary ─────────────────────────────────────
  customWords: loadCustomWords(),
  progress: loadLocalProgress(), // { wordId: { status, correctStreak, srsStage, lastReviewedAt, nextReviewAt } }

  // ─── AI Tutor & Gemini ──────────────────────────────
  geminiApiKey: getStoredApiKey(),
  aiChatHistory: loadStoredChatHistory(),

  setGeminiApiKey: (key) => {
    const cleanKey = (key || '').trim();
    saveApiKey(cleanKey);
    set({ geminiApiKey: cleanKey });
    const { firestoreSave, progress, customWords, aiChatHistory, user } = get();
    if (user && firestoreSave) {
      firestoreSave(progress, customWords, cleanKey, aiChatHistory);
    }
  },

  setAiChatHistory: (messages) => {
    const trimmed = Array.isArray(messages) ? messages.slice(-30) : [];
    saveStoredChatHistory(trimmed);
    set({ aiChatHistory: trimmed });
    const { firestoreSave, progress, customWords, geminiApiKey, user } = get();
    if (user && firestoreSave) {
      firestoreSave(progress, customWords, geminiApiKey, trimmed);
    }
  },

  getAllWords: () => {
    const { customWords } = get();
    return [...DEFAULT_VOCAB, ...customWords];
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
      if (state.firestoreSave) state.firestoreSave(newProgress, state.customWords, state.geminiApiKey, state.aiChatHistory);
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
    const { getWordState, updateWordState, markMastered, srsMode, addHistory, getAllWords, addQuizResult } = get();
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
    const { progress, updateWordState, srsMode } = get();
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

  // ─── Custom words ─────────────────────────────────────
  addCustomWords: (words) => {
    set(state => {
      const newCustom = [...state.customWords, ...words];
      saveCustomWords(newCustom);
      if (state.firestoreSave) state.firestoreSave(state.progress, newCustom, state.geminiApiKey, state.aiChatHistory);
      return { customWords: newCustom };
    });
  },

  deleteCustomWord: (id) => {
    set(state => {
      const newCustom = state.customWords.filter(w => w.id !== id);
      const newProgress = { ...state.progress };
      delete newProgress[id];
      saveLocalProgress(newProgress);
      saveCustomWords(newCustom);
      if (state.firestoreSave) state.firestoreSave(newProgress, newCustom, state.geminiApiKey, state.aiChatHistory);
      return { customWords: newCustom, progress: newProgress };
    });
  },

  resetProgress: () => {
    set(state => {
      const newProgress = {};
      saveLocalProgress(newProgress);
      if (state.firestoreSave) state.firestoreSave(newProgress, state.customWords, state.geminiApiKey, state.aiChatHistory);
      return { progress: newProgress, sessionCorrect: 0, sessionTotal: 0, history: [] };
    });
  },

  loadFromFirestore: (data) => {
    if (!data) return;
    const { progress, customWords, geminiApiKey, aiChatHistory } = data;
    if (progress) {
      saveLocalProgress(progress);
    }
    if (customWords) {
      saveCustomWords(customWords);
    }
    const updates = {
      progress: progress || {},
      customWords: customWords || [],
    };
    if (typeof geminiApiKey === 'string' && geminiApiKey.trim()) {
      saveApiKey(geminiApiKey.trim());
      updates.geminiApiKey = geminiApiKey.trim();
    }
    if (Array.isArray(aiChatHistory)) {
      saveStoredChatHistory(aiChatHistory);
      updates.aiChatHistory = aiChatHistory;
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
