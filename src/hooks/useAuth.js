import { useEffect, useState, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { useStore } from '../store/useStore';
import { getStoredApiKey, loadStoredChatHistory } from '../services/geminiService';

export function useAuth() {
  const { setUser, loadFromFirestore, setFirestoreSave } = useStore();
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const [isSigningIn, setIsSigningIn] = useState(false);
  const unsubscribeSnapshot = useRef(null);

  // Firestore save function
  const saveToFirestore = async (customProgress, customWordsList, customApiKey, customHistory) => {
    const user = auth.currentUser;
    if (!user) return;
    setSyncStatus('syncing');
    try {
      const store = useStore.getState();
      const progress = customProgress !== undefined ? customProgress : store.progress;
      const customWords = customWordsList !== undefined ? customWordsList : store.customWords;
      const geminiApiKey = customApiKey !== undefined ? customApiKey : (store.geminiApiKey || '');
      const aiChatHistory = customHistory !== undefined ? customHistory : (store.aiChatHistory || []);

      await setDoc(doc(db, 'users', user.uid), {
        progress: progress || {},
        customWords: customWords || [],
        geminiApiKey: geminiApiKey || '',
        aiChatHistory: Array.isArray(aiChatHistory) ? aiChatHistory.slice(-30) : [],
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

          if (snap.exists()) {
            const data = snap.data();
            const remoteKey = (data?.geminiApiKey || '').trim();

            if (!remoteKey && localKey) {
              // Local has key, Firestore does not: sync local key to Firestore
              loadFromFirestore(data);
              await saveToFirestore(
                data.progress || useStore.getState().progress,
                data.customWords || useStore.getState().customWords,
                localKey,
                (Array.isArray(data.aiChatHistory) && data.aiChatHistory.length > 0) ? data.aiChatHistory : localChat
              );
            } else {
              // Firestore has key (or neither has key): update local from Firestore
              loadFromFirestore(data);
            }
          } else {
            // New user document: sync current local data up to Firestore
            await saveToFirestore(
              useStore.getState().progress,
              useStore.getState().customWords,
              localKey,
              localChat
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
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google sign-in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        alert('Đăng nhập thất bại: ' + err.message);
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
