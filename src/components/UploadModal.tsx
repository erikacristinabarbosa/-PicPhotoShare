import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '../SessionContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { X, UploadCloud, Image as ImageIcon, Video, Loader2, Camera, CheckCircle, AlertCircle, RefreshCcw, ExternalLink, HelpCircle, ChevronRight } from 'lucide-react';
import { Settings } from '../types';
import { compressImage } from '../lib/imageCompression';
import Portal from './Portal';

type Mode = 'initial' | 'gallery' | 'camera' | 'preview';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'queued' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
  preview?: string;
}

const FRAMES = [
  { id: 'none', name: 'Sem Moldura', url: null },
  { 
    id: 'polaroid', 
    name: 'Polaroid', 
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><path d="M 0 0 L 800 0 L 800 1000 L 0 1000 Z M 40 40 L 40 760 L 760 760 L 760 40 Z" fill="#FFFFFF" fill-rule="evenodd" /><text x="400" y="860" font-size="70" text-anchor="middle" fill="#333" font-family="sans-serif" font-weight="bold">#15AnosDaAna</text><text x="400" y="930" font-size="35" text-anchor="middle" fill="#666" font-family="sans-serif">Um momento inesquecível</text></svg>`)}`
  },
  { 
    id: 'gold', 
    name: 'Dourada', 
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><rect x="30" y="30" width="740" height="940" fill="none" stroke="#D4A373" stroke-width="12" /><rect x="50" y="50" width="700" height="900" fill="none" stroke="#D4A373" stroke-width="4" /><path d="M 30 100 L 100 30 M 700 30 L 770 100 M 30 900 L 100 970 M 700 970 L 770 900" stroke="#D4A373" stroke-width="12" /><text x="400" y="940" font-size="60" text-anchor="middle" fill="#D4A373" font-family="serif" font-style="italic">Ana 15</text></svg>`)}`
  },
  { 
    id: 'floral', 
    name: 'Floral', 
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><rect x="20" y="20" width="760" height="960" fill="none" stroke="#FFB6C1" stroke-width="8" rx="40" /><text x="40" y="100" font-size="140">🌸</text><text x="760" y="100" font-size="140" text-anchor="end">🌺</text><text x="40" y="960" font-size="140">🌺</text><text x="760" y="960" font-size="140" text-anchor="end">🌸</text><text x="400" y="100" font-size="60" text-anchor="middle" fill="#FF69B4" font-family="serif" font-style="italic">Ana</text></svg>`)}`
  },
  { 
    id: 'neon', 
    name: 'Neon', 
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><rect x="40" y="40" width="720" height="920" fill="none" stroke="#FF1493" stroke-width="15" rx="30" filter="drop-shadow(0 0 15px #FF1493)" /><text x="400" y="900" font-size="70" text-anchor="middle" fill="#FFF" font-family="sans-serif" font-weight="900" filter="drop-shadow(0 0 10px #FF1493)">PARTY TIME</text></svg>`)}`
  }
];

const ACCESSORIES = [
  {
    id: 'crown',
    name: 'Coroa',
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><text x="400" y="180" font-size="200" text-anchor="middle" dominant-baseline="middle">👑</text></svg>`)}`
  },
  {
    id: 'glasses',
    name: 'Óculos',
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><text x="400" y="350" font-size="220" text-anchor="middle" dominant-baseline="middle">🕶️</text></svg>`)}`
  },
  {
    id: 'mask',
    name: 'Máscara',
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><text x="400" y="350" font-size="250" text-anchor="middle" dominant-baseline="middle">🎭</text></svg>`)}`
  },
  {
    id: 'balloons',
    name: 'Balões',
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><text x="150" y="250" font-size="180" text-anchor="middle" dominant-baseline="middle">🎈</text><text x="650" y="200" font-size="150" text-anchor="middle" dominant-baseline="middle">🎈</text></svg>`)}`
  },
  {
    id: 'confetti',
    name: 'Confete',
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><text x="400" y="100" font-size="150" text-anchor="middle" dominant-baseline="middle">🎉</text><text x="100" y="150" font-size="80">✨</text><text x="700" y="250" font-size="100">✨</text><text x="200" y="850" font-size="90">✨</text><text x="600" y="800" font-size="70">✨</text></svg>`)}`
  },
  {
    id: 'lips',
    name: 'Beijo',
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000"><text x="600" y="600" font-size="150" text-anchor="middle" dominant-baseline="middle" transform="rotate(-20 600 600)">💋</text></svg>`)}`
  }
];

export default function UploadModal({ onClose, isHostAlbum = false }: { onClose: () => void, isHostAlbum?: boolean }) {
  const { guestName, sessionId, authorPhotoUrl, setAuthorPhotoUrl } = useSession();
  const [mode, setMode] = useState<Mode>('initial');
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [settings, setSettings] = useState<Settings | null>(null);
  
  // Camera state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedVideoBlob, setCapturedVideoBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<string>('none');
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && uploading) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploading) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('keydown', handleEscape, true);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('keydown', handleEscape, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [uploading]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as Settings);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  // Cleanup camera stream when unmounting or changing mode
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    try {
      let stream: MediaStream;
      
      const tryGetStream = async (constraints: MediaStreamConstraints) => {
        return await navigator.mediaDevices.getUserMedia(constraints);
      };

      try {
        // Try with requested facing mode and audio
        stream = await tryGetStream({ video: { facingMode: mode }, audio: true });
      } catch (e) {
        try {
          // Try with requested facing mode but NO audio
          stream = await tryGetStream({ video: { facingMode: mode }, audio: false });
        } catch (e2) {
          try {
            // Try generic video only
            stream = await tryGetStream({ video: true, audio: false });
          } catch (e3) {
            throw e3;
          }
        }
      }
      
      setCameraStream(stream);
      setFacingMode(mode);
      setMode('camera');
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        const isAndroid = /Android/i.test(navigator.userAgent);
        if (isAndroid) {
          setError("Câmera bloqueada. No Android, para liberar a câmera, toque nos 3 pontos do navegador e escolha 'Abrir no Chrome' (ou seu navegador), e então permita o uso da câmera na mensagem do sistema. O navegador embutido do Instagram/WhatsApp normalmente bloqueia a câmera do evento.");
        } else {
          setError("Acesso à câmera negado. Clique no ícone de cadeado na barra de endereços para permitir a câmera.");
        }
      } else {
        setError("Não foi possível acessar a câmera do seu dispositivo.");
      }
    }
  };

  const toggleCamera = () => {
    startCamera(facingMode === 'user' ? 'environment' : 'user');
  };

  useEffect(() => {
    if (mode === 'camera' && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.error("Error playing video:", e));
    }
  }, [mode, cameraStream]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Ensure video has dimensions before capturing
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn("Video dimensions not ready");
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        
        // Stop camera
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }
        
        setMode('preview');
      }
    }
  };

  const startRecording = () => {
    if (!cameraStream) return;
    
    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(cameraStream, { mimeType: 'video/webm;codecs=vp9,opus' });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      setCapturedVideoBlob(blob);
      
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      
      setMode('preview');
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      onClose();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newUploadFiles: UploadFile[] = [];
      
      for (const file of selectedFiles) {
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');
        
        if (isVideo && settings && !settings.videoUploadsEnabled) {
          continue;
        }

        const maxSize = 30 * 1024 * 1024;
        if (file.size > maxSize) {
          setError(`O arquivo ${file.name} excede o limite de 30MB.`);
          continue;
        }

        if ((isVideo || isImage) && file.size <= maxSize) {
          let processedFile = file;
          
          if (isImage) {
            try {
              processedFile = await compressImage(file, 1200, 0.8);
            } catch (err) {
              console.error("Compression error:", err);
              // fallback to original
            }
          }

          // Protect proxy limits (32MB limit for Cloud Run HTTP/1.1 without chunks)
          if (processedFile.size > 25 * 1024 * 1024) { 
             setError(`O arquivo ${file.name} excedeu o limite seguro de tamanho.`);
             continue;
          }

          newUploadFiles.push({
            id: Math.random().toString(36).substring(7),
            file: processedFile,
            progress: 0,
            status: 'pending',
            preview: URL.createObjectURL(processedFile)
          });
        }
      }
      
      if (newUploadFiles.length !== selectedFiles.length) {
        setError('Alguns arquivos foram ignorados (tamanho excedido, formato inválido ou vídeos desativados).');
      }
      
      setUploadFiles(prev => [...prev, ...newUploadFiles]);
    }
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };


  const uploadSingleFile = async (fileObj: UploadFile, requireApproval: boolean, retryCount = 0): Promise<void> => {
    try {
      // Compress image before uploading
      let fileToUpload = fileObj.file;
      if (fileToUpload.type.startsWith('image/')) {
        fileToUpload = await compressImage(fileToUpload);
      }

      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', fileToUpload);

        // Add a timeout to the XHR
        xhr.timeout = 160000; // 2.6 minutes

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadFiles(prev => prev.map(f => 
            f.id === fileObj.id ? { ...f, progress: percentComplete } : f
          ));
        }
      };

      xhr.onload = async () => {
        const responseText = xhr.responseText.trim();
        const isHtml = responseText.startsWith('<') || responseText.startsWith('<!');
        const isTransientError = (xhr.status === 429 || xhr.status === 500 || xhr.status === 502 || xhr.status === 503 || xhr.status === 504 || isHtml);
        const canRetry = isTransientError && retryCount < 5;

        if (xhr.status >= 200 && xhr.status < 300 && !isHtml) {
          try {
            const driveData = JSON.parse(responseText);
            
            // Update session avatar if user doesn't have one and this is a photo
            if (!authorPhotoUrl && !fileObj.file.type.startsWith('video/') && driveData?.thumbnailLink) {
              setAuthorPhotoUrl(driveData.thumbnailLink);
            }

            await addDoc(collection(db, 'media'), {
              title: fileObj.file.name,
              type: fileObj.file.type.startsWith('video/') ? 'video' : 'photo',
              author: guestName,
              authorSessionId: sessionId,
              driveFileId: driveData?.id,
              driveViewLink: driveData?.webViewLink,
              thumbnailLink: driveData?.thumbnailLink || null,
              status: isHostAlbum ? 'approved' : (requireApproval ? 'pending' : 'approved'),
              timestamp: serverTimestamp(),
              likesCount: 0,
              isHostAlbum: isHostAlbum
            });
            
            if (!isHostAlbum) {
              // Points are dispatched after the modal processes all files
            }
            
            setUploadFiles(prev => prev.map(f => 
              f.id === fileObj.id ? { ...f, progress: 100, status: 'done' } : f
            ));
            resolve();
          } catch (err: any) {
            setUploadFiles(prev => prev.map(f => 
              f.id === fileObj.id ? { ...f, status: 'error', errorMsg: err.message || 'Erro ao salvar metadados' } : f
            ));
            reject(err);
          }
        } else if (canRetry) {
          // Handle Rate Limit (429), Server Errors (500+), and Unexpected HTML with exponential backoff
          const waitTime = Math.pow(2, retryCount) * 2000 + Math.random() * 1000;
          const statusMsg = isHtml ? 'Servidor carregando' : `Erro ${xhr.status}`;
          
          setUploadFiles(prev => prev.map(f => 
            f.id === fileObj.id ? { ...f, status: 'queued', errorMsg: `${statusMsg}. Tentando novamente em ${Math.round(waitTime/1000)}s... (Tentativa ${retryCount + 1}/5)` } : f
          ));
          
          setTimeout(() => {
            uploadSingleFile(fileObj, requireApproval, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, waitTime);
        } else {
          let errorMessage = 'Falha no upload';
          try {
            if (isHtml) {
              errorMessage = `Erro no Servidor (${xhr.status}): O sistema pode estar temporariamente indisponível.`;
            } else {
              const errData = JSON.parse(responseText);
              errorMessage = errData.error || errorMessage;
            }
          } catch (e) {
            if (xhr.status === 429) {
              errorMessage = 'Limite de envios excedido no Google Drive. Por favor, aguarde 1 minuto e tente novamente.';
            } else {
              errorMessage = `Erro no servidor (${xhr.status})`;
            }
          }
          setUploadFiles(prev => prev.map(f => 
            f.id === fileObj.id ? { ...f, status: 'error', errorMsg: errorMessage } : f
          ));
          reject(new Error(errorMessage));
        }
      };

      xhr.ontimeout = () => {
        if (retryCount < 4) {
          const waitTime = Math.pow(2, retryCount) * 2000 + 1000;
          setUploadFiles(prev => prev.map(f => 
            f.id === fileObj.id ? { ...f, status: 'queued', errorMsg: `Tempo esgotado. Tentando de novo em ${Math.round(waitTime/1000)}s... (${retryCount + 1}/5)` } : f
          ));
          setTimeout(() => {
            uploadSingleFile(fileObj, requireApproval, retryCount + 1).then(resolve).catch(reject);
          }, waitTime);
        } else {
          setUploadFiles(prev => prev.map(f => 
            f.id === fileObj.id ? { ...f, status: 'error', errorMsg: 'Tempo de envio esgotado após várias tentativas.' } : f
          ));
          reject(new Error('Tempo de envio esgotado'));
        }
      };

      xhr.onerror = () => {
        if (retryCount < 4) {
          const waitTime = Math.pow(2, retryCount) * 2000 + 1000;
          setUploadFiles(prev => prev.map(f => 
            f.id === fileObj.id ? { ...f, status: 'queued', errorMsg: `Erro de rede. Tentando de novo em ${Math.round(waitTime/1000)}s... (${retryCount + 1}/5)` } : f
          ));
          setTimeout(() => {
            uploadSingleFile(fileObj, requireApproval, retryCount + 1).then(resolve).catch(reject);
          }, waitTime);
        } else {
          setUploadFiles(prev => prev.map(f => 
            f.id === fileObj.id ? { ...f, status: 'error', errorMsg: 'Erro de rede ou arquivo muito grande: O servidor encerrou a conexão.' } : f
          ));
          reject(new Error('Erro de conexão com o servidor'));
        }
      };

      xhr.open('POST', '/api/upload', true);
      xhr.send(formData);
    });
    } catch (err) {
      console.error("Compression error:", err);
      // Fallback inside promise catch handled internally, but just in case
      return Promise.reject(err);
    }
  };

  const handleGalleryUpload = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    setError('');

    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      const settingsData = settingsDoc.data();
      if (!isHostAlbum && !settingsData?.uploadsEnabled) {
        throw new Error('O envio de novas fotos está desativado no momento.');
      }

      const requireApproval = isHostAlbum ? false : settingsData?.requireApproval;

      // Mark all pending as queued
      setUploadFiles(prev => prev.map(f => f.status === 'pending' ? { ...f, status: 'queued' } : f));

      // Upload sequentially to avoid hitting Google Drive API rate limits
      // We re-fetch the state to get the queued files
      const filesToUpload = uploadFiles.filter(f => f.status === 'pending' || f.status === 'queued');
      
      for (const fileObj of filesToUpload) {
        // Set current file to uploading
        setUploadFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'uploading' } : f));
        try {
          await uploadSingleFile(fileObj, requireApproval);
          // Add a delay between successful uploads to be kind to the Google Drive API
          await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
          console.error("Upload failed for", fileObj.file.name, err);
          // Continue with next file even if one fails
          await new Promise(r => setTimeout(r, 3000)); // Longer delay on error
        }
      }

      setUploadFiles(currentFiles => {
        const hasErrors = currentFiles.some(f => f.status === 'error');
        setUploading(false);
        if (!hasErrors) {
          if (requireApproval) {
            setSuccessMessage('Sua foto aparecerá no mural quando for aprovada pelo administrador. Ela já está disponível na guia "Minhas Fotos".');
            setTimeout(() => {
              if (!isHostAlbum && sessionId) window.dispatchEvent(new CustomEvent('points-earned', { detail: { actionName: 'Enviou Mídia', points: 10 * filesToUpload.length } }));
              onClose();
            }, 4000);
          } else {
            setTimeout(() => {
              if (!isHostAlbum && sessionId) window.dispatchEvent(new CustomEvent('points-earned', { detail: { actionName: 'Enviou Mídia', points: 10 * filesToUpload.length } }));
              onClose();
            }, 100);
          }
        }
        return currentFiles;
      });
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro durante o upload.');
      setUploading(false);
    }
  };

  const handleCameraUpload = async () => {
    if (!capturedImage && !capturedVideoBlob) return;
    setUploading(true);
    setError('');

    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      const settingsData = settingsDoc.data();
      if (!isHostAlbum && !settingsData?.uploadsEnabled) {
        throw new Error('O envio de novas fotos está desativado no momento.');
      }

      const requireApproval = isHostAlbum ? false : settingsData?.requireApproval;
      let file: File;

      if (capturedVideoBlob) {
        file = new File([capturedVideoBlob], `video_${Date.now()}.webm`, { type: 'video/webm' });
      } else if (capturedImage) {
        // Merge image and frame
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = capturedImage;
        await new Promise(r => img.onload = r);

        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        if (selectedFrame !== 'none') {
          const frameData = FRAMES.find(f => f.id === selectedFrame);
          if (frameData && frameData.url) {
            const frameImg = new Image();
            frameImg.src = frameData.url;
            await new Promise(r => frameImg.onload = r);
            ctx?.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
          }
        }

        for (const accId of selectedAccessories) {
          const accData = ACCESSORIES.find(a => a.id === accId);
          if (accData && accData.url) {
            const accImg = new Image();
            accImg.src = accData.url;
            await new Promise(r => accImg.onload = r);
            ctx?.drawImage(accImg, 0, 0, canvas.width, canvas.height);
          }
        }

        const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.9));
        if (!blob) throw new Error("Falha ao processar a imagem");
        file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      } else {
        throw new Error("Nenhuma mídia capturada");
      }
      
      const fileObj: UploadFile = {
        id: 'camera_capture',
        file,
        progress: 0,
        status: 'uploading'
      };
      
      setUploadFiles([fileObj]);

      await uploadSingleFile(fileObj, requireApproval);
      
      setUploading(false);
      if (requireApproval) {
        setSuccessMessage('Sua foto aparecerá no mural quando for aprovada pelo administrador. Ela já está disponível na guia "Minhas Fotos".');
        setTimeout(() => {
          if (!isHostAlbum && sessionId) window.dispatchEvent(new CustomEvent('points-earned', { detail: { actionName: 'Enviou Mídia', points: 10 } }));
          onClose();
        }, 4000);
      } else {
        setTimeout(() => {
          if (!isHostAlbum && sessionId) window.dispatchEvent(new CustomEvent('points-earned', { detail: { actionName: 'Enviou Mídia', points: 10 } }));
          onClose();
        }, 100);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro durante o upload.');
      setUploading(false);
    }
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-[9999] overflow-y-auto overscroll-none">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => !uploading && handleClose()} />
      <div className="flex min-h-full items-center justify-center p-0 sm:p-4">
        <div className="bg-white rounded-none sm:rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh] border border-pink-50 relative">
        <div className="p-4 sm:p-6 border-b border-pink-50 flex items-center justify-between bg-white/50 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-outfit text-gray-800">
              {mode === 'initial' ? 'Compartilhar Momentos' : 
               mode === 'gallery' ? 'Upload da Galeria' : 
               mode === 'camera' ? 'Tirar Foto' : 'Preview da Foto'}
            </h2>
          </div>
          <button onClick={handleClose} disabled={uploading} className="p-2 hover:bg-pink-50 text-gray-400 hover:text-gray-600 rounded-full transition-colors disabled:opacity-30">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-[#FAFAFA]">
          {error && (
            <div className="mb-6 p-5 bg-red-50 text-red-700 rounded-3xl text-sm border border-red-100 flex flex-col gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle size={20} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-red-800 mb-1">Acesso à Câmera Negado</p>
                  <p className="text-red-600 leading-relaxed">{error}</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => {
                      setError('');
                      if (mode === 'camera') startCamera();
                    }}
                    className="flex-1 min-w-[140px] px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                  >
                    <RefreshCcw size={16} />
                    Tentar Novamente
                  </button>
                  <a 
                    href={window.location.href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[140px] px-4 py-2.5 bg-white border-2 border-red-200 hover:bg-red-50 text-red-700 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={16} />
                    Abrir em Nova Aba
                  </a>
                </div>
                
                <button 
                  onClick={() => setShowTroubleshooting(true)}
                  className="w-full py-2 text-red-500 hover:text-red-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <HelpCircle size={14} />
                  Ver guia passo a passo para liberar a câmera
                </button>
              </div>
            </div>
          )}

          {showTroubleshooting && (
            <div className="fixed inset-0 z-[10010] overflow-y-auto">
              <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowTroubleshooting(false)} />
              <div className="flex min-h-full items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in duration-300">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-xl text-gray-900">Como liberar a câmera</h3>
                  <button onClick={() => setShowTroubleshooting(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full btn-gold shadow-md flex items-center justify-center font-bold shrink-0">1</div>
                      <div>
                        <p className="font-bold text-gray-800">Clique no Cadeado</p>
                        <p className="text-sm text-gray-500">Na barra de endereços do navegador (onde fica o link), clique no ícone de cadeado ou de configurações.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full btn-gold shadow-md flex items-center justify-center font-bold shrink-0">2</div>
                      <div>
                        <p className="font-bold text-gray-800">Ative a Câmera</p>
                        <p className="text-sm text-gray-500">Procure por "Câmera" e mude a chave para "Permitir" ou "Ativado".</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full btn-gold shadow-md flex items-center justify-center font-bold shrink-0">3</div>
                      <div>
                        <p className="font-bold text-gray-800">Recarregue a Página</p>
                        <p className="text-sm text-gray-500">Clique em "Tentar Novamente" ou atualize a página para aplicar as mudanças.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-xs text-blue-700 font-medium flex items-center gap-2 mb-2">
                      <ExternalLink size={14} />
                      Dica para iPhone/Safari:
                    </p>
                    <p className="text-xs text-blue-600 leading-relaxed">
                      Vá em Ajustes {'>'} Safari {'>'} Câmera e mude para "Permitir". Certifique-se também de que não está no modo de Navegação Privada.
                    </p>
                  </div>

                  <button 
                    onClick={() => setShowTroubleshooting(false)}
                    className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all active:scale-95"
                  >
                    Entendi, vou tentar
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-2xl text-sm border border-green-100 flex items-start gap-3">
              <CheckCircle className="shrink-0 mt-0.5" size={18} />
              <p>{successMessage}</p>
            </div>
          )}

          {mode === 'initial' && (
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setMode('gallery')}
                className="flex items-center gap-4 p-6 bg-white border border-gray-200 rounded-3xl hover:border-[#D4A373] hover:shadow-md transition-all group"
              >
                <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center text-[#D4A373] group-hover:scale-110 transition-transform">
                  <UploadCloud size={32} />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-lg text-gray-900">Upload da Galeria</h3>
                  <p className="text-sm text-gray-500">Selecione fotos e vídeos do seu dispositivo</p>
                </div>
              </button>

              <button 
                onClick={() => startCamera()}
                className="flex items-center gap-4 p-6 bg-white border border-gray-200 rounded-3xl hover:border-[#D4A373] hover:shadow-md transition-all group"
              >
                <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center text-[#D4A373] group-hover:scale-110 transition-transform">
                  <Camera size={32} />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-lg text-gray-900">Tirar Foto</h3>
                  <p className="text-sm text-gray-500">Use a câmera e adicione molduras divertidas</p>
                </div>
              </button>
            </div>
          )}

          {mode === 'gallery' && (
            <div className="space-y-6">
              <div 
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 bg-white ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-pink-50/50 hover:border-[#D4A373] border-gray-200 shadow-sm hover:shadow-md'}`}
              >
                <UploadCloud className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 font-medium mb-2">Clique para selecionar arquivos</p>
                <p className="text-sm text-gray-400">Fotos (JPG, PNG) e Vídeos (MP4) até 30MB</p>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*"
                multiple
              />

              {uploadFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-gray-700">Arquivos Selecionados ({uploadFiles.length})</h4>
                    {uploading && (
                      <span className="text-xs font-medium text-[#D4A373]">
                        Enviando {uploadFiles.filter(f => f.status === 'done' || f.status === 'error').length} de {uploadFiles.length}...
                      </span>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                    {uploadFiles.map((fileObj) => (
                      <div key={fileObj.id} className="bg-white p-3 rounded-xl border flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative">
                            {fileObj.file.type.startsWith('video/') ? (
                              <>
                                <video 
                                  src={fileObj.preview} 
                                  className="w-full h-full object-cover opacity-60"
                                  muted
                                  playsInline
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Video size={16} className="text-gray-600" />
                                </div>
                              </>
                            ) : (
                              <img 
                                src={fileObj.preview} 
                                alt="Preview" 
                                className="w-full h-full object-cover" 
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-gray-800 truncate pr-2">{fileObj.file.name}</p>
                              {fileObj.status === 'queued' && <span className="text-[10px] uppercase font-bold text-gray-400">Na fila</span>}
                              {fileObj.status === 'uploading' && <span className="text-[10px] uppercase font-bold text-[#D4A373]">{fileObj.progress}%</span>}
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full transition-all duration-300 ${fileObj.status === 'error' ? 'bg-red-500' : fileObj.status === 'done' ? 'bg-green-500' : fileObj.status === 'queued' ? 'bg-gray-300' : 'bg-[#D4A373]'}`}
                                style={{ width: `${fileObj.status === 'queued' ? 0 : fileObj.progress}%` }}
                              ></div>
                            </div>
                            {fileObj.status === 'error' && <p className="text-xs text-red-500 mt-1 truncate">{fileObj.errorMsg}</p>}
                          </div>
                        </div>
                        
                        {!uploading && (
                          <button onClick={() => removeFile(fileObj.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                            <X size={16} />
                          </button>
                        )}
                        {fileObj.status === 'uploading' && <Loader2 size={18} className="text-[#D4A373] animate-spin shrink-0" />}
                        {fileObj.status === 'done' && <CheckCircle size={18} className="text-green-500 shrink-0" />}
                        {fileObj.status === 'error' && <AlertCircle size={18} className="text-red-500 shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'camera' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-full aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-inner">
                <video 
                  ref={videoRef} 
                  playsInline 
                  muted
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={toggleCamera}
                  className="absolute top-4 right-4 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
                  title="Virar Câmera"
                >
                  <RefreshCcw size={24} />
                </button>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-6">
                <button 
                  onClick={capturePhoto}
                  disabled={isRecording}
                  className="w-16 h-16 bg-white border-4 border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                  title="Tirar Foto"
                >
                  <div className="w-12 h-12 bg-[#D4A373] rounded-full"></div>
                </button>
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className="w-16 h-16 bg-white border-4 border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                  title={isRecording ? "Parar Gravação" : "Gravar Vídeo"}
                >
                  <div className={`w-8 h-8 transition-all ${isRecording ? 'bg-red-500 rounded-sm' : 'bg-red-500 rounded-full'}`}></div>
                </button>
              </div>
            </div>
          )}

          {mode === 'preview' && (capturedImage || capturedVideoBlob) && (
            <div className="flex flex-col space-y-6">
              <div className="relative w-full aspect-[3/4] bg-gray-100 rounded-3xl overflow-hidden shadow-inner">
                {capturedImage ? (
                  <img src={capturedImage} alt="Preview" className="w-full h-full object-cover" />
                ) : capturedVideoBlob ? (
                  <video src={URL.createObjectURL(capturedVideoBlob)} controls playsInline className="w-full h-full object-cover" />
                ) : null}
                {capturedImage && selectedFrame !== 'none' && (
                  <img 
                    src={FRAMES.find(f => f.id === selectedFrame)?.url || ''} 
                    alt="Frame" 
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />
                )}
                {capturedImage && selectedAccessories.map(accId => (
                  <img 
                    key={accId}
                    src={ACCESSORIES.find(a => a.id === accId)?.url || ''} 
                    alt="Accessory" 
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />
                ))}
              </div>

              {capturedImage && (
                <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Escolha uma Moldura</h4>
                  <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                    {FRAMES.map(frame => (
                      <button
                        key={frame.id}
                        onClick={() => setSelectedFrame(frame.id)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedFrame === frame.id ? 'btn-gold shadow-md' : 'btn-beige'}`}
                      >
                        {frame.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Acessórios e Efeitos</h4>
                  <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                    {ACCESSORIES.map(acc => {
                      const isSelected = selectedAccessories.includes(acc.id);
                      return (
                        <button
                          key={acc.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedAccessories(prev => prev.filter(id => id !== acc.id));
                            } else {
                              setSelectedAccessories(prev => [...prev, acc.id]);
                            }
                          }}
                          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${isSelected ? 'btn-gold shadow-md' : 'btn-beige'}`}
                        >
                          {acc.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              )}
              
              {uploadFiles.length > 0 && uploadFiles[0].status !== 'pending' && (
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${uploadFiles[0].status === 'error' ? 'bg-red-500' : uploadFiles[0].status === 'done' ? 'bg-green-500' : 'bg-[#D4A373]'}`}
                    style={{ width: `${uploadFiles[0].progress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-pink-50 bg-white/50 flex gap-3">
          {mode !== 'initial' && !uploading && (
            <button 
              onClick={() => {
                if (mode === 'preview') {
                  setMode('camera');
                  startCamera();
                } else {
                  setMode('initial');
                  setUploadFiles([]);
                }
              }}
              className="flex-1 py-3 btn-beige rounded-xl font-medium"
            >
              Voltar
            </button>
          )}
          
          {mode === 'gallery' && (
            <button 
              onClick={handleGalleryUpload}
              disabled={uploadFiles.length === 0 || uploading}
              className="flex-[2] btn-gold rounded-xl py-3 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><Loader2 size={20} className="animate-spin" /> Enviando...</>
              ) : (
                `Enviar ${uploadFiles.length} arquivo${uploadFiles.length !== 1 ? 's' : ''}`
              )}
            </button>
          )}

          {mode === 'preview' && (
            <button 
              onClick={handleCameraUpload}
              disabled={uploading}
              className="flex-[2] btn-gold rounded-xl py-3 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><Loader2 size={20} className="animate-spin" /> Enviando...</>
              ) : (
                'Enviar Foto'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
  </Portal>
  );
}
