import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fade out after 2 seconds
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2000);

    // Complete splash screen after 2.5 seconds (allowing 0.5s for fade out animation)
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#ebebec] transition-opacity duration-500 ease-in-out ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <img 
        src="/logo.jpg" 
        alt="Logo" 
        className="w-64 md:w-80 h-auto object-contain animate-[pulse_2s_ease-in-out_infinite]" 
        onError={(e) => {
          // Fallback if logo.jpg is not found
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}
