import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '../SessionContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { GuestbookEntry, Settings } from '../types';
import { PenTool, Image as ImageIcon, X, CheckCircle, Loader2, Trash2, Search, ChevronLeft, ChevronRight, Share2, BookOpen } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import imageCompression from 'browser-image-compression';
import { toPng } from 'html-to-image';
import EmptyState from './EmptyState';
import ShareModal from './ShareModal';
import ScrollDots from './ScrollDots';
import { motion, AnimatePresence } from 'motion/react';
import GuestbookCard from './GuestbookCard';

import Portal from './Portal';

export default function Guestbook({ isAdmin, highlightId, settings }: { isAdmin: boolean, highlightId?: string, settings?: Settings }) {
  const { guestName, sessionId, guestSessionId, authorPhotoUrl, setAuthorPhotoUrl } = useSession();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [guestSearch, setGuestSearch] = useState('');

  useEffect(() => {
    if (highlightId && !loading && entries.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`entry-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          element.classList.add('ring-4', 'ring-[#D4A373]', 'ring-offset-4');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-[#D4A373]', 'ring-offset-4');
          }, 5000);
        }
      }, 800);
    }
  }, [highlightId, loading, entries]);

  const clearSearch = () => {
    setGuestSearch('');
  };
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<{id: string, driveFileId?: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shareData, setShareData] = useState<{url: string, title: string, mediaUrl?: string} | null>(null);

  const sigCanvas = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const formatName = (input: string) => {
    if (!input) return 'Anônimo';
    return input
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const filteredEntries = React.useMemo(() => {
    const search = guestSearch.trim().toLowerCase();
    if (!search) return entries;
    return entries.filter(e => 
      formatName(e.author).toLowerCase().includes(search)
    );
  }, [entries, guestSearch]);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [filteredEntries]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'guestbook'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GuestbookEntry[];
      setEntries(entriesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione apenas imagens.');
        return;
      }
      
      try {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          useWebWorker: false
        };
        const compressedFile = await imageCompression(file, options);
        const finalFile = new File([compressedFile], file.name, { type: file.type });
        setPhotoFile(finalFile);
        setPhotoPreview(URL.createObjectURL(finalFile));
      } catch (err) {
        console.error("Compression error:", err);
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
      }
    }
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Por favor, escreva uma mensagem.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let driveFileId = null;
      let thumbnailLink = null;

      if (photoFile) {
        if (photoFile.size > 25 * 1024 * 1024) {
          throw new Error('A imagem é muito grande mesmo após a compressão (ou falhou ao comprimir). O limite máximo de segurança é 25MB.');
        }

        // Multi-attempt upload logic
        let uploadSuccess = false;
        let lastError = '';
        
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const formData = new FormData();
            formData.append('file', photoFile);

            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });

            const responseText = await response.text();
            
            if (responseText.trim().startsWith('<') || responseText.trim().startsWith('<!')) {
              console.error("HTML response received:", responseText.substring(0, 200));
              throw new Error('O servidor rejeitou o envio (possivelmente o arquivo é muito grande). Tente carregar uma foto menor.');
            }

            if (!response.ok) {
              let msg = 'Erro no upload';
              try {
                const errJson = JSON.parse(responseText);
                msg = errJson.error || msg;
              } catch(e) {}
              throw new Error(msg);
            }

            const driveData = JSON.parse(responseText);
            driveFileId = driveData.id || null;
            thumbnailLink = driveData.thumbnailLink || null;
            uploadSuccess = true;
            break;
          } catch (err: any) {
            console.error(`Upload attempt ${attempt + 1} failed:`, err);
            lastError = err.message;
            if (attempt < 2) {
              const waitTime = Math.pow(2, attempt + 1) * 2000 + Math.random() * 1000;
              await new Promise(r => setTimeout(r, waitTime)); // Wait and retry securely
            }
          }
        }

        if (!uploadSuccess) {
          throw new Error(`Falha ao enviar a foto após várias tentativas: ${lastError}`);
        }
      }

      const signatureDataUrl = sigCanvas.current?.isEmpty() ? null : sigCanvas.current?.getCanvas().toDataURL('image/png');

      const docData: any = {
        author: guestName,
        authorSessionId: sessionId,
        authorPhotoUrl: authorPhotoUrl,
        message: message.trim(),
        timestamp: serverTimestamp()
      };

      if (driveFileId) {
        docData.driveFileId = driveFileId;
        // If the user doesn't have an avatar yet, use this photo as their avatar
        if (!authorPhotoUrl && thumbnailLink) {
          setAuthorPhotoUrl(thumbnailLink);
        }
      }
      if (thumbnailLink) docData.thumbnailLink = thumbnailLink;
      if (signatureDataUrl) docData.signatureDataUrl = signatureDataUrl;

      await addDoc(collection(db, 'guestbook'), docData);
      
      if (sessionId) {
        window.dispatchEvent(new CustomEvent('points-earned', { detail: { actionName: 'Escreveu Mensagem', points: 5 } }));
      }

      setSuccess(true);
      setTimeout(() => {
        setIsFormOpen(false);
        setSuccess(false);
        setMessage('');
        setPhotoFile(null);
        setPhotoPreview(null);
        clearSignature();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao salvar sua mensagem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, driveFileId?: string) => {
    setEntryToDelete({ id, driveFileId });
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    
    setIsDeleting(true);
    try {
      if (entryToDelete.driveFileId) {
        await fetch(`/api/drive/${entryToDelete.driveFileId}`, { method: 'DELETE' });
      }
      await deleteDoc(doc(db, 'guestbook', entryToDelete.id));
      setEntryToDelete(null);
    } catch (err) {
      console.error("Error deleting entry:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const [isCapturing, setIsCapturing] = useState<string | null>(null);

  const handleShare = async (entry: GuestbookEntry) => {
    if (isAdmin) {
      try {
        setIsCapturing(entry.id);
        const element = document.getElementById(`entry-${entry.id}`);
        if (!element) return;
        
        // Hide buttons temporarily for capture
        const buttons = element.querySelectorAll('button');
        const originalOpacities: string[] = [];
        buttons.forEach(btn => {
          originalOpacities.push(btn.style.opacity);
          btn.style.opacity = '0';
        });
        
        // Wait a frame for styles to apply
        await new Promise(r => setTimeout(r, 100));
        
        const dataUrl = await toPng(element, { 
          quality: 0.95, 
          pixelRatio: 2,
          backgroundColor: '#ffffff'
        });
        
        // Restore buttons
        buttons.forEach((btn, index) => {
          btn.style.opacity = originalOpacities[index];
        });
        
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `mensagem-${entry.id}.png`, { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Mensagem de ${formatName(entry.author)}`,
            text: `Mensagem de ${formatName(entry.author)} no livro de visitas!`
          });
        } else {
          const a = document.createElement('a');
          a.download = `mensagem-${entry.author}.png`;
          a.href = dataUrl;
          a.click();
        }
      } catch (err) {
        console.error('Error capturing and sharing image:', err);
        alert('Erro ao gerar a imagem para compartilhamento.');
      } finally {
        setIsCapturing(null);
      }
    } else {
      const url = `${window.location.origin}/?guestbookId=${entry.id}`;
      const title = `Confira a mensagem de ${formatName(entry.author)} no painel Deixe um Carinho!`;
      const mediaUrl = entry.driveFileId ? `/api/image/${entry.driveFileId}` : undefined;
      setShareData({ url, title, mediaUrl });
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 mb-10 mt-4 flex-wrap">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 bg-pink-50/50 px-3 py-1 rounded-full border border-pink-100/50"
        >
          <BookOpen size={14} className="text-rose-600" />
          <h2 className="text-sm font-serif font-bold text-gray-800 tracking-tight whitespace-nowrap">
            Deixe um carinho ({entries.length})
          </h2>
        </motion.div>
        <p className="text-[10px] text-gray-500 italic">Deixe uma mensagem especial!</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between xl:justify-end mb-6 gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <input
              type="text"
              placeholder="Buscar convidado..."
              value={guestSearch}
              onChange={(e) => setGuestSearch(e.target.value)}
              className="w-full sm:w-72 bg-white border border-gray-200 rounded-full py-3 pl-12 pr-10 text-sm focus:ring-2 focus:ring-[#D4A373] focus:border-transparent outline-none transition-all shadow-sm hover:shadow-md"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4A373]">
              <Search size={20} />
            </div>
            {guestSearch && (
              <button 
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors"
                title="Limpar busca"
              >
                <X size={12} />
              </button>
            )}
          </div>
          {(!isFormOpen && (isAdmin || settings?.uploadsEnabled !== false)) && (
            <button 
              onClick={() => setIsFormOpen(true)}
              className="bg-gradient-to-r from-[#D4A373] to-[#B88A5B] text-white px-8 py-3 rounded-full text-base font-medium hover:shadow-lg transition-all flex items-center justify-center gap-3 shrink-0 transform hover:scale-105 active:scale-95 shadow-lg"
            >
              <PenTool size={20} />
              Deixar Mensagem
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <Portal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsFormOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 w-full max-w-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-200 via-[#D4A373] to-pink-200"></div>
                
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-serif text-gray-800">Sua Mensagem</h3>
                  <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                {success ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
                      <CheckCircle className="text-green-500" size={40} />
                    </div>
                    <h4 className="text-2xl font-serif text-gray-800">Mensagem Enviada!</h4>
                    <p className="text-gray-500">Obrigado por deixar sua marca neste dia especial.</p>
                    <button 
                      onClick={() => setIsFormOpen(false)}
                      className="mt-6 btn-gold px-8 py-2 rounded-full font-medium"
                    >
                      Fechar
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                        {error}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem</label>
                      <textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 focus:ring-2 focus:ring-[#D4A373] focus:border-transparent outline-none transition-all resize-none h-32"
                        placeholder="Escreva algo bonito..."
                        maxLength={1000}
                      />
                      <div className="text-right text-xs text-gray-400 mt-1">{message.length}/1000</div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Foto (Opcional)</label>
                      {photoPreview ? (
                        <div className="relative inline-block">
                          <img src={photoPreview} alt="Preview" className="h-32 w-32 object-cover rounded-2xl shadow-sm border border-gray-200" />
                          <button 
                            type="button"
                            onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                            className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-md hover:bg-red-50"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:bg-gray-50 hover:border-[#D4A373] transition-all"
                        >
                          <ImageIcon className="mx-auto text-gray-400 mb-2" size={24} />
                          <p className="text-sm text-gray-500">Clique para adicionar uma foto</p>
                        </div>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handlePhotoSelect} 
                        className="hidden" 
                        accept="image/*" 
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <label className="block text-sm font-medium text-gray-700">Assinatura (Opcional)</label>
                        <button type="button" onClick={clearSignature} className="text-xs text-[#D4A373] hover:underline">Limpar</button>
                      </div>
                      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
                        <SignatureCanvas 
                          ref={sigCanvas}
                          canvasProps={{ className: 'w-full h-40 cursor-crosshair' }}
                          penColor="#1a1a1a"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                      <button 
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="px-6 py-3 rounded-full font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="btn-gold px-8 py-3 rounded-full font-medium disabled:opacity-70 flex items-center gap-2"
                      >
                        {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Enviar Mensagem'}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Entries Carousel */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#D4A373]" size={40} />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState 
          icon={PenTool}
          title="O livro de visitas está vazio."
          description="Seja o primeiro a deixar uma mensagem!"
        />
      ) : filteredEntries.length === 0 ? (
        <EmptyState 
          icon={Search}
          title="Nenhuma mensagem encontrada."
          description="Tente buscar por outro nome ou limpe a busca."
          action={
            guestSearch.trim() && (
              <button 
                onClick={clearSearch}
                className="mt-6 text-[#D4A373] font-medium hover:underline"
              >
                Limpar busca
              </button>
            )
          }
        />
      ) : (
        <div className="relative group">
          {/* Elegant Arrows */}
          {showLeftArrow && (
            <button 
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 bg-white/90 backdrop-blur-md p-3 rounded-full shadow-xl text-[#D4A373] hover:bg-white hover:scale-110 transition-all hidden md:flex items-center justify-center border border-pink-50"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          
          {showRightArrow && (
            <button 
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 bg-white/90 backdrop-blur-md p-3 rounded-full shadow-xl text-[#D4A373] hover:bg-white hover:scale-110 transition-all hidden md:flex items-center justify-center border border-pink-50"
            >
              <ChevronRight size={24} />
            </button>
          )}

          <ScrollDots containerRef={scrollContainerRef} itemCount={filteredEntries.length} />

          <div 
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex overflow-x-auto gap-4 sm:gap-8 px-4 sm:px-4 py-8 snap-x snap-mandatory no-scrollbar custom-scrollbar pb-12 w-full"
          >
            {filteredEntries.map((entry) => (
              <GuestbookCard 
                key={entry.id}
                entry={entry}
                isAdmin={isAdmin}
                settings={settings}
                sessionId={sessionId}
                guestSessionId={guestSessionId}
                guestName={guestName}
                handleDelete={handleDelete}
                handleShare={handleShare}
                formatName={formatName}
              />
            ))}
          </div>
          
          {/* Hint for scrolling */}
          <div className="flex justify-center gap-2 mt-2">
            <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#D4A373] w-1/3 animate-shimmer"></div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <Portal>
        <div className="fixed inset-0 z-[10000] overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setEntryToDelete(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
              <h3 className="text-xl font-serif text-gray-800 mb-2">Excluir Mensagem</h3>
            <p className="text-gray-600 mb-6">Tem certeza que deseja excluir esta mensagem? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setEntryToDelete(null)} 
                disabled={isDeleting}
                className="btn-beige px-4 py-2 rounded-full font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete} 
                disabled={isDeleting}
                className="px-6 py-2 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      </div>
      </Portal>
      )}
      {/* Share Modal */}
      {shareData && (
        <ShareModal 
          isOpen={!!shareData}
          onClose={() => setShareData(null)}
          url={shareData.url}
          title={shareData.title}
          mediaUrl={shareData.mediaUrl}
          mediaType={shareData.mediaUrl ? 'photo' : undefined}
        />
      )}
    </div>
  );
}
