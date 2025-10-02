import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, enableNetwork } from 'firebase/firestore';
import { auth, db, checkFirestoreConnection, realtimeDb } from '../firebase/config';
import { ref, set } from 'firebase/database';
import { User } from '../types';
import { useNotification } from './NotificationContext';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  isOnline: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
  const { addNotification } = useNotification();

  // Monitor connection status
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await checkFirestoreConnection();
      setIsOnline(connected);
      if (!connected) {
        addNotification('You are currently offline. Some features may be limited.', 'warning');
      }
    };

    checkConnection();
  }, [addNotification]);

  const createUserDocument = async (user: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const userData: User = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || null,
          bio: '',
          location: '',
          website: '',
          experience: '',
          education: '',
          skills: [],
          rank: Math.floor(Math.random() * 10000),
          score: Math.floor(Math.random() * 10000),
          problemsSolved: Math.floor(Math.random() * 100),
          followers: Math.floor(Math.random() * 1000),
          following: Math.floor(Math.random() * 500),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await setDoc(userRef, userData);
        
        // Also save to Realtime Database for messaging
        await set(ref(realtimeDb, `users/${user.uid}`), {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || null,
          username: userData.username || null,
          createdAt: new Date().toISOString()
        });
        
        setUserData(userData);
      } else {
        const firestoreData = userSnap.data() as User;
        setUserData(firestoreData);
        
        // Sync to Realtime Database
        await set(ref(realtimeDb, `users/${user.uid}`), {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || firestoreData.displayName || '',
          photoURL: user.photoURL || firestoreData.photoURL || null,
          username: firestoreData.username || null,
          createdAt: firestoreData.createdAt
        });
      }
    } catch (error) {
      console.warn('Failed to create/fetch user document:', error);
      addNotification('Failed to sync user data. Working in offline mode.', 'warning');
      
      // Create a basic profile for offline use
      const basicProfile: User = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || null,
        bio: '',
        location: '',
        website: '',
        experience: '',
        education: '',
        skills: [],
        rank: 0,
        score: 0,
        problemsSolved: 0,
        followers: 0,
        following: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setUserData(basicProfile);
    }
  };

  const signup = async (email: string, password: string, displayName: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName });
    await createUserDocument(user);
    addNotification({
      type: 'success',
      title: 'Welcome to Hack2rank!',
      message: 'Your account has been created successfully.'
    });
    return user;
  };

  const login = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    addNotification({
      type: 'success',
      title: 'Welcome back!',
      message: 'You have successfully signed in.'
    });
    return result.user;
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, provider);
    await createUserDocument(user);
    addNotification({
      type: 'success',
      title: 'Welcome!',
      message: 'You have successfully signed in with Google.'
    });
    return user;
  };

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
    addNotification({
      type: 'info',
      title: 'Signed out',
      message: 'You have been successfully signed out.'
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        await createUserDocument(user);
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    isOnline,
    pendingRedirect,
    setPendingRedirect,
    login,
    signup,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};