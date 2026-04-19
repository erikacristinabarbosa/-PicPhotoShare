/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { SessionProvider, useSession } from './SessionContext';
import { db } from './firebase';
import { doc, getDoc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import Login from './components/Login';
import Gallery from './components/Gallery';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import SplashScreen from './components/SplashScreen';
import PageTransition from './components/PageTransition';
import { Settings } from './types';

async function testConnection() {
  try {
    console.log("Testing Firestore connection...");
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firestore Error: The client is offline. Please check your Firebase configuration and network.");
    } else {
      console.error("Firestore Connection Test Error:", error);
    }
  }
}
testConnection();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { sessionId } = useSession();
  if (!sessionId) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AnimatedRoutes({ settings }: { settings: Settings | null }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Login settings={settings} /></PageTransition>} />
        <Route 
          path="/gallery" 
          element={
            <ProtectedRoute>
              <PageTransition><Gallery settings={settings} /></PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route path="/admin/login" element={<PageTransition><AdminLogin /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminPanel /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

import { ExternalLink, AlertTriangle } from 'lucide-react';

function IframeWarning() {
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  if (!isIframe) return null;

  return (
    <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between gap-4 shadow-xl sticky top-0 z-[100] animate-bounce-subtle">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-full">
          <AlertTriangle size={20} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold">Atenção: Modo de Visualização</p>
          <p className="text-[10px] sm:text-xs opacity-90">
            A câmera pode ser bloqueada aqui. Clique em "Abrir Agora" para liberar.
          </p>
        </div>
      </div>
      <a 
        href={window.location.href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="bg-white text-red-600 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-gray-100 transition-all shadow-lg active:scale-95 shrink-0"
      >
        <ExternalLink size={16} />
        ABRIR AGORA
      </a>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Settings;
        setSettings(data);
      } else {
        // Document might not exist yet if it's a first-time setup
        console.log("Settings document not found, it will be initialized by the creator/admin.");
      }
    }, (err) => {
      console.error("Error listening to settings:", err);
    });
    return () => unsubscribe();
  }, []);

  return (
    <SessionProvider>
      <IframeWarning />
      {showSplash && (
        <SplashScreen 
          onComplete={() => setShowSplash(false)} 
        />
      )}
      <Router>
        <div className={`min-h-screen bg-[#f5f2ed] text-[#1a1a1a] font-sans transition-opacity duration-1000 ${!showSplash ? 'opacity-100 animate-lens-open' : 'opacity-0'}`}>
          <AnimatedRoutes settings={settings} />
        </div>
      </Router>
    </SessionProvider>
  );
}
