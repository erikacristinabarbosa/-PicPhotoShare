import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface SessionContextType {
  sessionId: string | null;
  guestSessionId: string | null;
  guestName: string | null;
  authorPhotoUrl: string | null;
  login: (name: string) => void;
  logout: () => void;
  setAuthorPhotoUrl: (url: string | null) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [authorPhotoUrl, setAuthorPhotoUrlState] = useState<string | null>(null);

  useEffect(() => {
    // Check for guest session in localStorage first (fast)
    const storedSession = localStorage.getItem('guestSession');
    const storedName = localStorage.getItem('guestName');
    if (storedSession) {
      setGuestSessionId(storedSession);
      if (storedName) {
        setSessionId(storedSession);
        setGuestName(storedName);
      }
    }

    // Check for Firebase Auth for Admin session override
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // If admin is logged in via Firebase Auth, use their UID as sessionId
        setSessionId(user.uid);
        const currentStoredName = localStorage.getItem('guestName');
        setGuestName(currentStoredName || 'Anfitrião');
      } else {
        // If not admin, re-check localStorage in case it changed or for guests
        const currentStoredSession = localStorage.getItem('guestSession');
        const currentStoredName = localStorage.getItem('guestName');
        if (currentStoredSession && currentStoredName) {
          setGuestSessionId(currentStoredSession);
          setSessionId(currentStoredSession);
          setGuestName(currentStoredName);
        } else {
          setSessionId(null);
          setGuestName(null);
        }
      }
    });

    const storedPhoto = localStorage.getItem('authorPhotoUrl');
    if (storedPhoto) {
      setAuthorPhotoUrlState(storedPhoto);
    }

    return () => unsubscribe();
  }, []);

  const setAuthorPhotoUrl = (url: string | null) => {
    if (url) {
      localStorage.setItem('authorPhotoUrl', url);
    } else {
      localStorage.removeItem('authorPhotoUrl');
    }
    setAuthorPhotoUrlState(url);
  };

  // Log access when sessionId and guestName are set
  useEffect(() => {
    if (sessionId && guestName) {
      const logAccess = async () => {
        // Only log once per window/tab load to avoid spamming on every state change
        const hasLoggedAccess = sessionStorage.getItem('hasLoggedAccess');
        if (!hasLoggedAccess) {
          try {
            await addDoc(collection(db, 'access_logs'), {
              guestName,
              sessionId,
              timestamp: serverTimestamp()
            });
            sessionStorage.setItem('hasLoggedAccess', 'true');
          } catch (error) {
            console.error("Error logging access:", error);
          }
        }
      };
      logAccess();
    }
  }, [sessionId, guestName]);

  const login = (name: string) => {
    const newSessionId = crypto.randomUUID();
    localStorage.setItem('guestSession', newSessionId);
    localStorage.setItem('guestName', name);
    // Clear the specific session storage log so it logs the new session
    sessionStorage.removeItem('hasLoggedAccess');
    setGuestSessionId(newSessionId);
    setSessionId(newSessionId);
    setGuestName(name);
  };

  const logout = () => {
    localStorage.removeItem('guestSession');
    localStorage.removeItem('guestName');
    localStorage.removeItem('authorPhotoUrl');
    setGuestSessionId(null);
    setSessionId(null);
    setGuestName(null);
    setAuthorPhotoUrlState(null);
  };

  return (
    <SessionContext.Provider value={{ sessionId, guestSessionId, guestName, authorPhotoUrl, login, logout, setAuthorPhotoUrl }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
