import React, { useState } from 'react';
import { X, MessageCircle, Facebook, Twitter, Link as LinkIcon, Share2, Instagram, Download } from 'lucide-react';
import Portal from './Portal';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  mediaUrl?: string;
  mediaType?: 'photo' | 'video' | string;
}

export default function ShareModal({ isOpen, onClose, url, title, mediaUrl, mediaType }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

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
      name: 'Instagram',
      icon: Instagram,
      color: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]',
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          alert('Link copiado! Cole no seu Story ou Direct do Instagram.');
          window.open('https://instagram.com', '_blank');
        } catch (e) {
          console.error(e);
        }
      }
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
      if (mediaUrl) {
        setIsPreparing(true);
        try {
          // In case it's a relative URL or an API url
          const fetchUrl = mediaUrl.startsWith('/') ? `${window.location.origin}${mediaUrl}` : mediaUrl;
          const response = await fetch(fetchUrl);
          const blob = await response.blob();
          const extension = mediaType === 'video' ? 'mp4' : 'jpg';
          const file = new File([blob], `media.${extension}`, { type: blob.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg') });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title,
              text: title,
              files: [file]
            });
            setIsPreparing(false);
            return;
          }
        } catch (e) {
          console.error('Failed to share file object, falling back to link', e);
        }
        setIsPreparing(false);
      }

      try {
        await navigator.share({ title, url });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDownload = async () => {
    if (!mediaUrl) return;
    setIsPreparing(true);
    try {
      const fetchUrl = mediaUrl.startsWith('/') ? `${window.location.origin}${mediaUrl}` : mediaUrl;
      const response = await fetch(fetchUrl);
      const blob = await response.blob();
      const extension = mediaType === 'video' ? 'mp4' : 'jpg';
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `media.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.error('Failed to download media', e);
      alert('Erro ao baixar mídia.');
    }
    setIsPreparing(false);
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-[10000] overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
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
            <button onClick={handleNativeShare} disabled={isPreparing} className="flex flex-col items-center gap-2 group disabled:opacity-50">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Share2 size={20} />
              </div>
              <span className="text-xs text-gray-600 font-medium text-center">Mais</span>
            </button>
          )}
          {mediaUrl && (
             <button onClick={handleDownload} disabled={isPreparing} className="flex flex-col items-center gap-2 group disabled:opacity-50">
               <div className="w-12 h-12 rounded-full bg-gray-800 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                 <Download size={20} />
               </div>
               <span className="text-xs text-gray-600 font-medium text-center">Baixar</span>
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
              className="px-4 py-1.5 btn-gold text-sm font-medium rounded-lg shrink-0"
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  </Portal>
  );
}
