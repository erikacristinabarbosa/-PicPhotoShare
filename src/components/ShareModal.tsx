import React, { useState } from 'react';
import { X, MessageCircle, Facebook, Twitter, Link as LinkIcon, Share2 } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export default function ShareModal({ isOpen, onClose, url, title }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500',
      onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank')
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600',
      onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
    },
    {
      name: 'X (Twitter)',
      icon: Twitter,
      color: 'bg-black',
      onClick: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank')
    }
  ];

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-serif text-gray-800">Compartilhar</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {shareLinks.map(link => (
            <button key={link.name} onClick={link.onClick} className="flex flex-col items-center gap-2 group">
              <div className={`w-12 h-12 rounded-full ${link.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                <link.icon size={20} />
              </div>
              <span className="text-xs text-gray-600 font-medium text-center">{link.name}</span>
            </button>
          ))}
          {navigator.share && (
            <button onClick={handleNativeShare} className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Share2 size={20} />
              </div>
              <span className="text-xs text-gray-600 font-medium text-center">Mais</span>
            </button>
          )}
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
              <LinkIcon size={14} className="text-gray-500" />
            </div>
            <input 
              type="text" 
              readOnly 
              value={url} 
              className="flex-1 bg-transparent text-sm text-gray-600 outline-none truncate"
            />
            <button 
              onClick={handleCopy}
              className="px-4 py-1.5 bg-[#D4A373] text-white text-sm font-medium rounded-lg hover:bg-[#c39162] transition-colors shrink-0"
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
