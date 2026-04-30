import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface ScrollDotsProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemCount: number;
  className?: string;
}

export default function ScrollDots({ containerRef, itemCount, className = "" }: ScrollDotsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!container) return;
      const scrollLeft = container.scrollLeft;
      const width = container.offsetWidth;
      const index = Math.round(scrollLeft / Math.max(width, 1));
      setActiveIndex(index);
      
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < container.scrollWidth - container.clientWidth - 10);
    };

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    // Initial check
    setTimeout(handleScroll, 100);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [containerRef, itemCount]);

  const scrollBy = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (!container) return;
    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

  if (itemCount <= 1) return null;

  return (
    <div className={`flex items-center justify-between mb-4 px-6 md:px-0 ${className}`}>
      {/* Mobile Hint & Dots */}
      <div className="flex md:hidden items-center justify-between w-full">
        <div className="flex justify-center gap-1.5 flex-1">
          {Array.from({ length: Math.min(itemCount, 5) }).map((_, i) => (
            <div 
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === (activeIndex % 5) ? 'bg-[#D4A373] w-3' : 'bg-gray-200'
              }`}
            />
          ))}
          {itemCount > 5 && <div className="text-[10px] text-gray-400 font-medium ml-1">+{itemCount - 5}</div>}
        </div>
      </div>

      {/* Desktop Hint & Arrows */}
      <div className="hidden md:flex items-center justify-between w-full px-6">
        <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
          {canScrollRight && (
             <>Deslize para ver mais <ArrowRight size={14} className="animate-bounce-x" /></>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => scrollBy('left')}
            disabled={!canScrollLeft}
            className={`p-2 rounded-full border transition-all ${
              canScrollLeft ? 'border-[#D4A373] text-[#D4A373] hover:bg-[#D4A373]/10 shadow-sm' : 'border-gray-100 text-gray-200 cursor-not-allowed'
            }`}
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={() => scrollBy('right')}
            disabled={!canScrollRight}
            className={`p-2 rounded-full border transition-all ${
               canScrollRight ? 'border-[#D4A373] text-[#D4A373] hover:bg-[#D4A373]/10 shadow-sm' : 'border-gray-100 text-gray-200 cursor-not-allowed'
            }`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
