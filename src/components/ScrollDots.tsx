import React, { useState, useEffect } from 'react';

interface ScrollDotsProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemCount: number;
  className?: string;
}

export default function ScrollDots({ containerRef, itemCount, className = "" }: ScrollDotsProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const width = container.offsetWidth;
      const index = Math.round(scrollLeft / width);
      setActiveIndex(index);
    };

    container.addEventListener('scroll', handleScroll);
    // Initial check
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, itemCount]);

  if (itemCount <= 1) return null;

  return (
    <div className={`flex justify-center gap-1.5 mb-4 md:hidden ${className}`}>
      {Array.from({ length: itemCount }).map((_, i) => (
        <div 
          key={i}
          className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
            i === activeIndex ? 'bg-[#D4A373] w-3' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}
