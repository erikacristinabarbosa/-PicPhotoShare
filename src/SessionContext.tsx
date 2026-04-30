import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

interface SessionContextType {
  sessionId: string | null;
  guestSessionId: string | null;
  guestName: string | null;
  authorPhotoUrl: string | null;
  login: (name: string, contact?: string) => void;
  logout: () => void;
  setAuthorPhotoUrl: (url: string | null) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [guestContact, setGuestContact] = useState<string | null>(null);
  const [authorPhotoUrl, setAuthorPhotoUrlState] = useState<string | null>(null);

  useEffect(() => {
    // Check for guest session in localStorage first (fast)
    const storedSession = localStorage.getItem('guestSession');
    const storedName = localStorage.getItem('guestName');
    const storedContact = localStorage.getItem('guestContact');
    
    if (storedSession && storedName) {
      if (!storedContact) {
        // Force logout for old sessions without phone number (to migrate them to the new pin system)
        localStorage.removeItem('guestSession');
        localStorage.removeItem('guestName');
        setGuestSessionId(null);
        setSessionId(null);
        setGuestName(null);
      } else {
        setGuestContact(storedContact);
        setGuestSessionId(storedSession);
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
        const currentStoredContact = localStorage.getItem('guestContact');
        
        if (currentStoredSession && currentStoredName) {
          if (!currentStoredContact) {
            localStorage.removeItem('guestSession');
            localStorage.removeItem('guestName');
            setSessionId(null);
            setGuestName(null);
          } else {
            // Verify if user still exists in database
            const cleanPhone = currentStoredContact.replace(/\D/g, '');
            getDoc(doc(db, 'guest_users', cleanPhone)).then(snapshot => {
              if (!snapshot.exists()) {
                localStorage.removeItem('guestSession');
                localStorage.removeItem('guestName');
                localStorage.removeItem('guestContact');
                setSessionId(null);
                setGuestName(null);
                setGuestContact(null);
                setGuestSessionId(null);
              } else {
                setGuestSessionId(currentStoredSession);
                setSessionId(currentStoredSession);
                setGuestName(currentStoredName);
                setGuestContact(currentStoredContact);
              }
            }).catch(console.error);
          }
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
              contact: guestContact,
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

  const login = (name: string, contact?: string) => {
    const newSessionId = crypto.randomUUID();
    localStorage.setItem('guestSession', newSessionId);
    localStorage.setItem('guestName', name);
    if (contact) { localStorage.setItem('guestContact', contact); setGuestContact(contact); } else { localStorage.removeItem('guestContact'); setGuestContact(null); }
    // Clear the specific session storage log so it logs the new session
    sessionStorage.removeItem('hasLoggedAccess');
    setGuestSessionId(newSessionId);
    setSessionId(newSessionId);
    setGuestName(name);
  };

  const logout = () => {
    localStorage.removeItem('guestSession');
    localStorage.removeItem('guestName');
    localStorage.removeItem('guestContact');
    setGuestContact(null);
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
