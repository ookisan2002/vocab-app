import { useEffect, useState, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { useStore } from '../store/useStore';
import {
  getStoredApiKey,
  loadStoredChatHistory,
  loadStoredChatSessions,
  getActiveConfig,
} from '../services/geminiService';

export function useAuth() {
  const { setUser, loadFromFirestore, setFirestoreSave } = useStore();
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const [isSigningIn, setIsSigningIn] = useState(false);
  const unsubscribeSnapshot = useRef(null);

  // Firestore save function
  const saveToFirestore = async (
    customProgress,
    customWordsList,
    customApiKey,
    customHistory,
    customModelConfig,
    customEditedWords,
    customDeletedWordIds,
    customChatSessions,
    customExamSettings,
    customExamHistory
  ) => {
    const user = auth.currentUser;
    if (!user) return;
    setSyncStatus('syncing');
    try {
      const store = useStore.getState();
      const progress = customProgress !== undefined ? customProgress : store.progress;
      const customWords = customWordsList !== undefined ? customWordsList : store.customWords;
      const geminiApiKey = customApiKey !== undefined ? customApiKey : (store.geminiApiKey || '');
      const aiChatHistory = customHistory !== undefined ? customHistory : (store.aiChatHistory || []);
      const geminiModelConfig = customModelConfig !== undefined ? customModelConfig : (store.geminiModelConfig || getActiveConfig());
      const editedWords = customEditedWords !== undefined ? customEditedWords : (store.editedWords || {});
      const deletedWordIds = customDeletedWordIds !== undefined ? customDeletedWordIds : (store.deletedWordIds || []);
      const chatSessions = customChatSessions !== undefined ? customChatSessions : (store.chatSessions || []);
      const examSettings = customExamSettings !== undefined ? customExamSettings : store.examSettings;
      const examHistory = customExamHistory !== undefined ? customExamHistory : (store.examHistory || []);

      // Derive fallback aiChatHistory from latest session if empty
      let fallbackHistory = aiChatHistory;
      if ((!Array.isArray(fallbackHistory) || fallbackHistory.length === 0) && Array.isArray(chatSessions) && chatSessions.length > 0) {
        fallbackHistory = chatSessions[0].messages || [];
      }

      await setDoc(doc(db, 'users', user.uid), {
        progress: progress || {},
        customWords: customWords || [],
        geminiApiKey: geminiApiKey || '',
        aiChatHistory: Array.isArray(fallbackHistory) ? fallbackHistory.slice(-50) : [],
        aiChatSessions: Array.isArray(chatSessions) ? chatSessions.slice(0, 50) : [],
        geminiModelConfig: geminiModelConfig || null,
        editedWords: editedWords || {},
        deletedWordIds: deletedWordIds || [],
        examSettings: examSettings || null,
        examHistory: Array.isArray(examHistory) ? examHistory.slice(0, 30) : [],
        updatedAt: Date.now(),
      }, { merge: true });
      setSyncStatus('synced');
    } catch (err) {
      console.error('Firestore save error:', err);
      setSyncStatus('error');
    }
  };

  // Subscribe to Firestore real-time updates
  const subscribeToFirestore = (uid) => {
    if (unsubscribeSnapshot.current) {
      unsubscribeSnapshot.current();
    }
    const docRef = doc(db, 'users', uid);
    unsubscribeSnapshot.current = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        loadFromFirestore(snap.data());
        setSyncStatus('synced');
      }
    }, (err) => {
      console.error('Firestore snapshot error:', err);
      setSyncStatus('error');
    });
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setFirestoreSave(saveToFirestore);
        // Load initial data from Firestore
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(docRef);
          const localKey = (useStore.getState().geminiApiKey || getStoredApiKey() || '').trim();
          const localChat = useStore.getState().aiChatHistory || loadStoredChatHistory() || [];
          const localSessions = useStore.getState().chatSessions || loadStoredChatSessions() || [];
          const localModelConfig = useStore.getState().geminiModelConfig || getActiveConfig();

          if (snap.exists()) {
            const data = snap.data();
            const remoteKey = (data?.geminiApiKey || '').trim();

            if (!remoteKey && localKey) {
              // Local has key, Firestore does not: sync local key and modelConfig to Firestore
              loadFromFirestore(data);
              await saveToFirestore(
                data.progress || useStore.getState().progress,
                data.customWords || useStore.getState().customWords,
                localKey,
                (Array.isArray(data.aiChatHistory) && data.aiChatHistory.length > 0) ? data.aiChatHistory : localChat,
                data.geminiModelConfig || localModelConfig,
                data.editedWords || useStore.getState().editedWords,
                data.deletedWordIds || useStore.getState().deletedWordIds,
                (Array.isArray(data.aiChatSessions) && data.aiChatSessions.length > 0) ? data.aiChatSessions : localSessions,
                data.examSettings || useStore.getState().examSettings,
                (Array.isArray(data.examHistory) && data.examHistory.length > 0) ? data.examHistory : (useStore.getState().examHistory || [])
              );
            } else {
              // Firestore has key (or neither has key): update local from Firestore
              loadFromFirestore(data);
              if (!data.geminiModelConfig && localModelConfig?.model) {
                await saveToFirestore(
                  data.progress || useStore.getState().progress,
                  data.customWords || useStore.getState().customWords,
                  remoteKey || localKey,
                  data.aiChatHistory || localChat,
                  localModelConfig,
                  data.editedWords || useStore.getState().editedWords,
                  data.deletedWordIds || useStore.getState().deletedWordIds,
                  (Array.isArray(data.aiChatSessions) && data.aiChatSessions.length > 0) ? data.aiChatSessions : localSessions,
                  data.examSettings || useStore.getState().examSettings,
                  (Array.isArray(data.examHistory) && data.examHistory.length > 0) ? data.examHistory : (useStore.getState().examHistory || [])
                );
              }
            }
          } else {
            // New user document: sync current local data up to Firestore
            await saveToFirestore(
              useStore.getState().progress,
              useStore.getState().customWords,
              localKey,
              localChat,
              localModelConfig,
              useStore.getState().editedWords,
              useStore.getState().deletedWordIds,
              localSessions,
              useStore.getState().examSettings,
              useStore.getState().examHistory
            );
          }
          setSyncStatus('synced');
        } catch (err) {
          console.error('Firestore initial load error:', err);
          setSyncStatus('error');
        }
        subscribeToFirestore(firebaseUser.uid);
      } else {
        setUser(null);
        setFirestoreSave(null);
        setSyncStatus('idle');
        if (unsubscribeSnapshot.current) {
          unsubscribeSnapshot.current();
          unsubscribeSnapshot.current = null;
        }
      }
      setLoading(false);
    });

    return () => {
      unsub();
      if (unsubscribeSnapshot.current) unsubscribeSnapshot.current();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      // Ensure local persistence is set before initiating popup
      await setPersistence(auth, browserLocalPersistence).catch(() => {});
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google sign-in error:', err);
      const isPopupClosed =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request';
      const isMissingInitialState =
        err?.code === 'auth/missing-initial-state' ||
        (err?.message && err.message.toLowerCase().includes('missing initial state'));

      if (isPopupClosed) {
        console.warn('Google sign-in popup was closed by user.');
      } else if (isMissingInitialState) {
        // Fallback retry attempt for cross-origin partition issues
        try {
          console.warn('Retrying signInWithPopup after missing initial state...');
          await setPersistence(auth, browserLocalPersistence);
          await signInWithPopup(auth, googleProvider);
          return;
        } catch (retryErr) {
          console.error('Retry Google sign-in failed:', retryErr);
          if (
            retryErr?.code !== 'auth/popup-closed-by-user' &&
            retryErr?.code !== 'auth/cancelled-popup-request'
          ) {
            alert(
              'Đăng nhập chưa hoàn tất do trình duyệt giới hạn cookie hoặc trạng thái phiên (Missing initial state). Vui lòng thử lại hoặc mở trong cửa sổ mới không chặn cookie.'
            );
          }
        }
      } else {
        alert('Đăng nhập thất bại: ' + (err?.message || 'Lỗi không xác định'));
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  return { loading, syncStatus, isSigningIn, signInWithGoogle, signOutUser };
}
