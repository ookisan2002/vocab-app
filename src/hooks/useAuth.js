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

export function useAuth() {
  const { setUser, loadFromFirestore, setFirestoreSave } = useStore();
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const [isSigningIn, setIsSigningIn] = useState(false);
  const unsubscribeSnapshot = useRef(null);

  // Firestore save function
  const saveToFirestore = async (progress, customWords) => {
    const user = auth.currentUser;
    if (!user) return;
    setSyncStatus('syncing');
    try {
      await setDoc(doc(db, 'users', user.uid), {
        progress,
        customWords,
        updatedAt: Date.now(),
      });
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
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            loadFromFirestore(snap.data());
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
