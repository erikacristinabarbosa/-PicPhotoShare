/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { SessionProvider, useSession } from './SessionContext';
import { RankingProvider } from './RankingContext';
import { db } from './firebase';
import { doc, getDoc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import Login from './components/Login';
import Gallery from './components/Gallery';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import PageTransition from './components/PageTransition';
import PointsAnimation from './components/PointsAnimation';
import { Settings } from './types';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { sessionId } = useSession();
  if (!sessionId) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AnimatedRoutes({ settings }: { settings: Settings | null }) {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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

export default function App() {
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
      <RankingProvider>
        <PointsAnimation />
        <Router>
          <div className={`min-h-screen bg-[#f5f2ed] text-[#1a1a1a] font-sans transition-opacity duration-1000 opacity-100 animate-lens-open`}>
            <AnimatedRoutes settings={settings} />
          </div>
        </Router>
      </RankingProvider>
    </SessionProvider>
  );
}
