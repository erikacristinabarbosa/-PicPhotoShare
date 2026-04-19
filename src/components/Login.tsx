import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../SessionContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Settings } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, X, AlertCircle, ExternalLink, RefreshCcw, HelpCircle } from 'lucide-react';
import Footer from './Footer';

export default function Login({ settings: initialSettings }: { settings?: Settings | null }) {
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(initialSettings || null);
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [progress, setProgress] = useState(0);
  const { login, sessionId } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
      return;
    }
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as Settings);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, [initialSettings]);

  useEffect(() => {
    if (!settings?.eventDate) return;

    const eventTime = new Date(settings.eventDate).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = eventTime - now;

      if (distance < 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [settings?.eventDate]);

  useEffect(() => {
    if (showSplash) return; // Wait for splash screen to finish

    const params = new URLSearchParams(window.location.search);
    const inviteParam = params.get('invite');

    const checkInviteAndLogin = async () => {
      if (inviteParam) {
        setLoading(true);
        try {
          const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
          const settingsData = settingsDoc.data();
          if (settingsData && settingsData.inviteCode === inviteParam) {
            setInviteCode(inviteParam);
          } else {
            setError('Código de convite na URL é inválido.');
            setInviteCode(inviteParam);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };

    if (sessionId) {
      navigate({ pathname: '/gallery', search: window.location.search });
    } else {
      checkInviteAndLogin();
    }
  }, [sessionId, navigate, login, showSplash]);

  useEffect(() => {
    let html5QrCode: Html5Qrcode;
    if (isScanning) {
      html5QrCode = new Html5Qrcode("reader");
      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          try {
            const url = new URL(decodedText);
            const invite = url.searchParams.get('invite');
            if (invite) {
              setInviteCode(invite);
              setIsScanning(false);
            }
          } catch (e) {
            setInviteCode(decodedText);
            setIsScanning(false);
          }
        },
        (errorMessage) => {
          // parse error, ignore
        }
      ).catch((err) => {
        console.error("Error starting scanner", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || String(err).includes('Permission denied')) {
          setError("Acesso à câmera negado. Clique no ícone de cadeado na barra de endereços, mude 'Câmera' para 'Permitir' e clique em 'Tentar Novamente'. Ou abra em uma nova aba.");
        } else {
          setError("Não foi possível acessar a câmera para ler o QR Code. Certifique-se de que deu permissão ou tente abrir o app em uma nova aba.");
        }
        setIsScanning(false);
      });
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [isScanning]);

  const formatName = (input: string) => {
    return input
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      const settingsData = settingsDoc.data();

      if (!settingsData) {
        throw new Error('Configuração não encontrada.');
      }

      if (settingsData.inviteCode !== inviteCode) {
        throw new Error('Código de convite inválido.');
      }

      const trimmedName = name.trim();
      const nameParts = trimmedName.split(/\s+/);
      if (nameParts.length < 2 || nameParts[0].length < 2 || nameParts[1].length < 2) {
        throw new Error('Por favor, insira nome e sobrenome.');
      }

      const formattedName = formatName(trimmedName);
      login(formattedName);
      navigate({ pathname: '/gallery', search: window.location.search });
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showSplash) return;
    
    const duration = 2000; // 2 seconds
    const interval = 20;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setProgress(Math.min((currentStep / steps) * 100, 100));
      
      if (currentStep >= steps) {
        clearInterval(timer);
        setTimeout(() => setShowSplash(false), 400);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [showSplash]);

  if (showSplash) {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA]">
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
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="mt-8 text-[#D4A373] font-medium tracking-widest uppercase text-sm animate-pulse">
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 space-y-8">
        
        {/* 1. Text & Event Info (Moved to Top) */}
        <div className="text-center space-y-4 pb-2">
          <h1 className="text-4xl font-montserrat font-bold text-[#D4A373] tracking-widest uppercase drop-shadow-sm">
            {settings?.eventName || '15 Anos da Ana'}
          </h1>
          <p className="text-gray-500">
            {settings?.welcomeMessage || 'Compartilhe seus momentos conosco'}
          </p>

          {timeLeft && (
            <div className="flex justify-center gap-4 py-4">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-[#D4A373]">{timeLeft.days}</span>
                <span className="text-xs text-gray-500 uppercase">Dias</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-[#D4A373]">{timeLeft.hours}</span>
                <span className="text-xs text-gray-500 uppercase">Horas</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-[#D4A373]">{timeLeft.minutes}</span>
                <span className="text-xs text-gray-500 uppercase">Min</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-[#D4A373]">{timeLeft.seconds}</span>
                <span className="text-xs text-gray-500 uppercase">Seg</span>
              </div>
            </div>
          )}
        </div>

        {/* 2. Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-base font-medium text-gray-700 mb-1 text-center">
                Nome e Sobrenome
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
                placeholder="Digite seu nome e sobrenome"
                required
              />
            </div>
            <div>
              <label htmlFor="code" className="block text-base font-medium text-gray-700 mb-1 text-center">
                Código de Convite
              </label>
              <div className="flex gap-2">
                <input
                  id="code"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent outline-none transition-all"
                  placeholder="Digite o código"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsScanning(true)}
                  className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center shrink-0"
                  title="Ler QR Code"
                >
                  <QrCode size={24} />
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {error.includes('câmera') && (
                <div className="flex flex-wrap gap-2 mt-1">
                  <button 
                    onClick={() => {
                      setError('');
                      setIsScanning(true);
                    }}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCcw size={12} />
                    Tentar Novamente
                  </button>
                  <a 
                    href={window.location.href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-700 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1.5"
                  >
                    <ExternalLink size={12} />
                    Abrir em Nova Aba
                  </a>
                </div>
              )}
              {error.includes('câmera') && (
                <button 
                  type="button"
                  onClick={() => setShowTroubleshooting(true)}
                  className="text-[10px] text-red-500 hover:text-red-700 font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <HelpCircle size={12} />
                  Ver guia passo a passo para liberar a câmera
                </button>
              )}
            </div>
          )}

          {showTroubleshooting && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-xl text-gray-900">Como liberar a câmera</h3>
                  <button type="button" onClick={() => setShowTroubleshooting(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#D4A373] text-white flex items-center justify-center font-bold shrink-0">1</div>
                      <div>
                        <p className="font-bold text-gray-800">Clique no Cadeado</p>
                        <p className="text-sm text-gray-500">Na barra de endereços do navegador (onde fica o link), clique no ícone de cadeado ou de configurações.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#D4A373] text-white flex items-center justify-center font-bold shrink-0">2</div>
                      <div>
                        <p className="font-bold text-gray-800">Ative a Câmera</p>
                        <p className="text-sm text-gray-500">Procure por "Câmera" e mude a chave para "Permitir" ou "Ativado".</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#D4A373] text-white flex items-center justify-center font-bold shrink-0">3</div>
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
                    type="button"
                    onClick={() => setShowTroubleshooting(false)}
                    className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all active:scale-95"
                  >
                    Entendi, vou tentar
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D4A373] text-white rounded-full py-3 font-medium hover:bg-[#C39362] transition-colors disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar na Galeria'}
          </button>
        </form>

        {/* 3. Video (9:16 format) */}
        {settings?.eventVideoUrl && (
          <div className="w-full aspect-[9/16] mx-auto rounded-2xl overflow-hidden shadow-lg mt-6 bg-black">
            <video 
              src={settings.eventVideoUrl} 
              autoPlay 
              loop 
              muted 
              playsInline
              preload="auto"
              className="w-full h-full object-cover" 
            />
          </div>
        )}

        {isScanning && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-medium text-lg">Ler QR Code</h3>
                <button onClick={() => setIsScanning(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                <div id="reader" className="w-full rounded-xl overflow-hidden"></div>
                <p className="text-sm text-center text-gray-500 mt-4">
                  Aponte a câmera para o QR Code do evento
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="mt-12 w-full">
          <Footer />
        </div>
        </div>
      </div>
    </div>
  );
}
