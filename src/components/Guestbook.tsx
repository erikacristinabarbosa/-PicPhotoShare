import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '../SessionContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { GuestbookEntry, Settings } from '../types';
import { PenTool, Image as ImageIcon, X, CheckCircle, Loader2, Trash2, Search, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import imageCompression from 'browser-image-compression';
import EmptyState from './EmptyState';
import ShareModal from './ShareModal';

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
  const [shareData, setShareData] = useState<{url: string, title: string} | null>(null);

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
          maxSizeMB: 1,
          maxWidthOrHeight: 1280,
          useWebWorker: true
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
              throw new Error('O servidor respondeu de forma inesperada. O sistema pode estar reiniciando ou sob alta carga.');
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
              await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); // Wait and retry
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

  const handleShare = (entry: GuestbookEntry) => {
    const url = `${window.location.origin}/?guestbookId=${entry.id}`;
    const title = `Confira a mensagem de ${formatName(entry.author)} no painel Deixe um Carinho!`;
    setShareData({ url, title });
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <h2 className="font-serif text-2xl text-gray-800">Deixe um carinho</h2>
          <p className="text-gray-500 mt-2">Deixe uma mensagem especial ao(s) responsável(is) pela festa!</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative group">
            <input
              type="text"
              placeholder="Buscar convidado..."
              value={guestSearch}
              onChange={(e) => setGuestSearch(e.target.value)}
              className="w-full sm:w-72 bg-white border border-gray-200 rounded-full py-3 pl-12 pr-12 text-sm focus:ring-2 focus:ring-[#D4A373] focus:border-transparent outline-none transition-all shadow-sm hover:shadow-md"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4A373]">
              <Search size={18} />
            </div>
            {guestSearch && (
              <button 
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors"
                title="Limpar busca"
              >
                <X size={12} />
              </button>
            )}
          </div>
          {(!isFormOpen && (isAdmin || settings?.uploadsEnabled !== false)) && (
            <button 
              onClick={() => setIsFormOpen(true)}
              className="bg-[#D4A373] text-white px-8 py-3 rounded-full font-medium hover:bg-[#C39362] transition-colors shadow-lg flex items-center justify-center gap-2 shrink-0"
            >
              <PenTool size={18} />
              Deixar Mensagem
            </button>
          )}
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white rounded-[2rem] shadow-xl p-8 mb-12 border border-pink-50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-200 via-[#D4A373] to-pink-200"></div>
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-serif text-gray-800">Sua Mensagem</h3>
            <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600">
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

              <div className="pt-4 flex justify-end">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[#D4A373] text-white px-8 py-3 rounded-full font-medium hover:bg-[#C39362] transition-colors shadow-md disabled:opacity-70 flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Enviar Mensagem'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

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

          <div 
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex overflow-x-auto gap-8 px-4 py-8 snap-x snap-mandatory no-scrollbar custom-scrollbar pb-12"
          >
            {filteredEntries.map((entry) => (
              <div 
                key={entry.id} 
                id={`entry-${entry.id}`}
                className="bg-white rounded-[2.5rem] shadow-xl shadow-pink-100/10 overflow-hidden border border-pink-50 relative group/card shrink-0 w-[300px] sm:w-[400px] snap-center transition-all duration-500 hover:shadow-2xl hover:-translate-y-2"
              >
                {(isAdmin || (settings?.canDelete && (entry.authorSessionId === sessionId || entry.authorSessionId === guestSessionId))) && (
                  <button 
                    onClick={() => handleDelete(entry.id, entry.driveFileId)}
                    className="absolute top-6 right-6 p-2.5 bg-white/90 backdrop-blur-sm text-red-500 rounded-full opacity-0 group-hover/card:opacity-100 transition-all shadow-md z-10 hover:bg-red-50 hover:scale-110"
                    title="Excluir mensagem"
                  >
                    <Trash2 size={18} />
                  </button>
                )}

                <button 
                  onClick={() => handleShare(entry)}
                  className="absolute top-6 left-6 p-2.5 bg-white/90 backdrop-blur-sm text-[#D4A373] rounded-full opacity-0 group-hover/card:opacity-100 transition-all shadow-md z-10 hover:bg-amber-50 hover:scale-110"
                  title="Compartilhar mensagem"
                >
                  <Share2 size={18} />
                </button>
                
                {entry.driveFileId || entry.thumbnailLink ? (
                  <div className="w-full h-56 bg-gray-100 relative">
                    <img 
                      src={entry.driveFileId ? `/api/image/${entry.driveFileId}` : (entry.thumbnailLink?.replace('=s220', '=s800') || '')} 
                      alt="Foto do convidado" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
                  </div>
                ) : null}
                
                <div className={`p-8 ${!entry.thumbnailLink ? 'pt-10' : 'pt-4'}`}>
                  <div className="flex items-center gap-4 mb-6">
                    {entry.authorPhotoUrl ? (
                      <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center bg-gray-100">
                        <img 
                          src={entry.authorPhotoUrl} 
                          alt={entry.author} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-100 to-amber-100 flex items-center justify-center text-[#D4A373] font-serif text-2xl shadow-inner">
                        {formatName(entry.author).charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-serif text-xl text-gray-800">{formatName(entry.author)}</h4>
                      {entry.timestamp && (
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">
                          {new Date(entry.timestamp.toDate()).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <svg className="absolute -top-4 -left-2 w-8 h-8 text-pink-50 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C20.1216 16 21.017 16.8954 21.017 18V21C21.017 22.1046 20.1216 23 19.017 23H16.017C14.9124 23 14.017 22.1046 14.017 21ZM5.017 21L5.017 18C5.017 16.8954 5.91243 16 7.017 16H10.017C11.1216 16 12.017 16.8954 12.017 18V21C12.017 22.1046 11.1216 23 10.017 23H7.017C5.91243 23 5.017 22.1046 5.017 21ZM12.017 13H5.017V10H12.017V13ZM21.017 13H14.017V10H21.017V13ZM12.017 7H5.017V4H12.017V7ZM21.017 7H14.017V4H21.017V7Z" />
                    </svg>
                    <p className="text-gray-600 leading-relaxed italic text-sm sm:text-base relative z-10 text-center">
                      {entry.message}
                    </p>
                  </div>
                  
                  {entry.signatureDataUrl && (
                    <div className="flex justify-end mt-8 pt-6 border-t border-gray-50">
                      <img 
                        src={entry.signatureDataUrl} 
                        alt={`Assinatura de ${entry.author}`} 
                        className="h-20 object-contain opacity-70 grayscale hover:grayscale-0 transition-all duration-500"
                      />
                    </div>
                  )}
                </div>
              </div>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-serif text-gray-800 mb-2">Excluir Mensagem</h3>
            <p className="text-gray-600 mb-6">Tem certeza que deseja excluir esta mensagem? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setEntryToDelete(null)} 
                disabled={isDeleting}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-full font-medium transition-colors"
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
      )}
      {/* Share Modal */}
      {shareData && (
        <ShareModal 
          isOpen={!!shareData}
          onClose={() => setShareData(null)}
          url={shareData.url}
          title={shareData.title}
        />
      )}
    </div>
  );
}
