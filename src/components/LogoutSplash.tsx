import React, { useState, useEffect } from 'react';
import Portal from './Portal';

interface LogoutSplashProps {
  onComplete: () => void;
}

export default function LogoutSplash({ onComplete }: LogoutSplashProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const interval = 20;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setProgress(Math.min((currentStep / steps) * 100, 100));
      
      if (currentStep >= steps) {
        clearInterval(timer);
        setTimeout(onComplete, 400);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FAFAFA]">
        <div className="relative flex items-center justify-center">
          {/* Background Circle */}
          <svg className="absolute w-40 h-40 transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#f3e8d6"
              strokeWidth="4"
              fill="transparent"
            />
            {/* Progress Circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="url(#gold-gradient)"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-75 ease-linear"
            />
            <defs>
              <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#BF953F" />
                <stop offset="25%" stopColor="#FCF6BA" />
                <stop offset="50%" stopColor="#B38728" />
                <stop offset="75%" stopColor="#FBF5B7" />
                <stop offset="100%" stopColor="#AA771C" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Logo */}
          <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-sm z-10">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
        </div>
        <div className="mt-8 text-[#D4A373] font-medium tracking-widest uppercase text-sm animate-pulse">
          Saindo...
        </div>
      </div>
    </Portal>
  );
}
