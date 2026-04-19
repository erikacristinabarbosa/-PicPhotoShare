import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center animate-in fade-in zoom-in duration-700">
      <div className="relative mb-8 group">
        <div className="absolute inset-0 bg-[#D4A373]/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
        <div className="relative w-28 h-28 bg-gradient-to-br from-white to-pink-50/50 rounded-full flex items-center justify-center shadow-xl border border-white/60 backdrop-blur-sm">
          <Icon size={48} className="text-[#D4A373]" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="text-3xl font-serif text-gray-800 mb-3 tracking-tight">{title}</h3>
      {description && (
        <p className="text-gray-500 text-lg max-w-md mx-auto mb-8 leading-relaxed font-light">{description}</p>
      )}
      {action && (
        <div className="mt-2">{action}</div>
      )}
    </div>
  );
}
