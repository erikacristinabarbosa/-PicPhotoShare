import React, { useRef, useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Move, Type, Camera, QrCode, Image as ImageIcon, Download, RotateCcw, Upload, Calendar, Bold, Italic, Layers, Palette, Check, MessageSquare, X, Trash2 } from 'lucide-react';

interface DisplayGeneratorProps {
  eventName: string;
  eventDate?: string;
  inviteCode: string;
  eventPhotoUrl?: string;
  customBackgrounds?: Array<{id: string, name: string, url: string}>;
  onUpdateCustomBackgrounds?: (backgrounds: Array<{id: string, name: string, url: string}>) => void;
}

type TextElement = {
  x: number;
  y: number;
  scale: number;
  visible: boolean;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  shadow: boolean;
  uppercase: boolean;
}

const DEFAULT_BACKGROUNDS: Array<{id: string, name: string, url: string}> = [];

export default function DisplayGenerator({ eventName, eventDate, inviteCode, eventPhotoUrl, customBackgrounds = [], onUpdateCustomBackgrounds }: DisplayGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'bg' | 'elements' | 'styles'>('bg');
  const [backgrounds, setBackgrounds] = useState<Array<{id: string, name: string, url: string}>>([...customBackgrounds, ...DEFAULT_BACKGROUNDS]);

  useEffect(() => {
    setBackgrounds([...customBackgrounds, ...DEFAULT_BACKGROUNDS]);
  }, [customBackgrounds]);
  
  // Custom states
  const [customBg, setCustomBg] = useState<string | null>(customBackgrounds?.[0]?.url || null);
  const [customFooter, setCustomFooter] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState<string>('SUA MENSAGEM AQUI');
  
  const [transforms, setTransforms] = useState({
    name: { 
      x: 50, y: 15, scale: 1.0, visible: false, 
      fontFamily: 'serif', fontSize: 7, color: '#1a2e24', 
      bold: true, italic: false, shadow: false, uppercase: true 
    },
    message: { 
      x: 50, y: 70, scale: 1.0, visible: false, 
      fontFamily: 'serif', fontSize: 6, color: '#1a2e24', 
      bold: false, italic: false, shadow: false, uppercase: false 
    },
    date: { 
      x: 50, y: 22, scale: 1.0, visible: false, 
      fontFamily: '"Cinzel", serif', fontSize: 3.5, color: '#1a2e24', 
      bold: false, italic: false, shadow: false, uppercase: true 
    },
    photo: { x: 30, y: 45, scale: 1.0, visible: false },
    qr: { x: 75, y: 45, scale: 1.0, visible: false },
    footer: { x: 50, y: 88, scale: 1.0, visible: false }
  });

  const [activeElement, setActiveElement] = useState<'name' | 'message' | 'date' | 'photo' | 'qr' | 'footer' | null>('name');

  const fonts = [
    { name: 'Serif Elegante', value: 'serif' },
    { name: 'Sans Clean', value: 'sans-serif' },
    { name: 'Script/Cursiva', value: 'cursive' },
    { name: 'Modern Mono', value: 'monospace' },
    { name: 'Montserrat', value: '"Montserrat", sans-serif' },
    { name: 'Playfair Display', value: '"Playfair Display", serif' },
    { name: 'Cinzel (Clássico)', value: '"Cinzel", serif' },
    { name: 'Great Vibes (Elegante)', value: '"Great Vibes", cursive' },
    { name: 'Alex Brush (Sofisticado)', value: '"Alex Brush", cursive' },
    { name: 'Dancing Script', value: '"Dancing Script", cursive' },
    { name: 'Cormorant (Refinado)', value: '"Cormorant Garamond", serif' },
    { name: 'Lora', value: '"Lora", serif' },
    { name: 'Oswald (Forte)', value: '"Oswald", sans-serif' },
    { name: 'Parisienne (Romântico)', value: '"Parisienne", cursive' },
    { name: 'Inter', value: '"Inter", sans-serif' }
  ];

  const resetTransforms = () => {
    setTransforms({
      name: { 
        x: 50, y: 15, scale: 1.0, visible: false, 
        fontFamily: 'serif', fontSize: 7, color: '#1a2e24', 
        bold: true, italic: false, shadow: false, uppercase: true 
      },
      message: { 
        x: 50, y: 70, scale: 1.0, visible: false, 
        fontFamily: 'serif', fontSize: 6, color: '#1a2e24', 
        bold: false, italic: false, shadow: false, uppercase: false 
      },
      date: { 
        x: 50, y: 22, scale: 1.0, visible: false, 
        fontFamily: '"Cinzel", serif', fontSize: 3.5, color: '#1a2e24', 
        bold: false, italic: false, shadow: false, uppercase: true 
      },
      photo: { x: 30, y: 45, scale: 1.0, visible: false },
      qr: { x: 75, y: 45, scale: 1.0, visible: false },
      footer: { x: 50, y: 88, scale: 1.0, visible: false }
    });
    setCustomBg(backgrounds?.[0]?.url || null);
    setCustomFooter(null);
    setCustomMessage('SUA MENSAGEM AQUI');
  };

  const drawOnCanvas = async (canvas: HTMLCanvasElement, forExport = false) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Clear & Background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (customBg) {
      const bgImg = new Image();
      bgImg.src = customBg;
      await new Promise(r => { bgImg.onload = r; bgImg.onerror = r; });
      
      if (bgImg.complete && bgImg.naturalWidth > 0) {
        const imgAspect = bgImg.width / bgImg.height;
        const canvasAspect = canvas.width / canvas.height;
        let renderWidth, renderHeight, xOffset, yOffset;

        if (imgAspect > canvasAspect) {
          // Imagem é mais larga que o canvas (aspect ratio maior)
          renderHeight = canvas.height;
          renderWidth = canvas.height * imgAspect;
          xOffset = (canvas.width - renderWidth) / 2;
          yOffset = 0;
        } else {
          // Imagem é mais alta que o canvas
          renderWidth = canvas.width;
          renderHeight = canvas.width / imgAspect;
          xOffset = 0;
          yOffset = (canvas.height - renderHeight) / 2;
        }

        ctx.drawImage(bgImg, xOffset, yOffset, renderWidth, renderHeight);
      } else {
        ctx.fillStyle = '#FAF9F1';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      ctx.fillStyle = '#FAF9F1';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Function to draw text elements
    const drawText = (config: TextElement, text: string) => {
      if (!config.visible || !text) return;

      const fontSize = (canvas.width * (config.fontSize / 100)) * config.scale;
      const fontStyle = `${config.bold ? 'bold' : ''} ${config.italic ? 'italic' : ''}`;
      ctx.font = `${fontStyle} ${fontSize}px ${config.fontFamily}`;
      ctx.fillStyle = config.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (config.shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = fontSize * 0.1;
        ctx.shadowOffsetX = fontSize * 0.05;
        ctx.shadowOffsetY = fontSize * 0.05;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      const content = config.uppercase ? text.toUpperCase() : text;
      ctx.fillText(
        content, 
        (config.x / 100) * canvas.width, 
        (config.y / 100) * canvas.height
      );
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
    };

    // 2. Draw Name & Date & Message
    drawText(transforms.name, eventName);
    drawText(transforms.date, eventDate || '');
    drawText(transforms.message, customMessage);

    // 3. Draw Photo
    if (transforms.photo.visible && eventPhotoUrl) {
      const photo = new Image();
      photo.crossOrigin = 'anonymous';
      photo.src = eventPhotoUrl;
      await new Promise(r => { photo.onload = r; photo.onerror = r; });

      if (photo.complete && photo.naturalWidth > 0) {
        const baseSize = canvas.width * 0.45;
        const size = baseSize * transforms.photo.scale;
        const centerX = (transforms.photo.x / 100) * canvas.width;
        const centerY = (transforms.photo.y / 100) * canvas.height;

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        const aspect = photo.width / photo.height;
        let dw, dh, dx, dy;
        if (aspect > 1) {
          dh = size; dw = size * aspect;
        } else {
          dw = size; dh = size / aspect;
        }
        dx = centerX - dw / 2;
        dy = centerY - dh / 2;
        ctx.drawImage(photo, dx, dy, dw, dh);
        ctx.restore();

        ctx.lineWidth = Math.max(1, (12 * (canvas.width/1500)) * transforms.photo.scale);
        ctx.strokeStyle = '#D4A373';
        ctx.beginPath();
        ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 4. Draw QR
    if (transforms.qr.visible) {
      const qrCanvas = qrRef.current?.querySelector('canvas');
      if (qrCanvas) {
        const baseSize = canvas.width * 0.32;
        const size = baseSize * transforms.qr.scale;
        const centerX = (transforms.qr.x / 100) * canvas.width;
        const centerY = (transforms.qr.y / 100) * canvas.height;
        const x = centerX - size / 2;
        const y = centerY - size / 2;

        ctx.fillStyle = '#FFFFFF';
        if (!forExport) {
          ctx.shadowColor = 'rgba(0,0,0,0.1)';
          ctx.shadowBlur = 10;
        }
        ctx.fillRect(x, y, size, size);
        ctx.shadowBlur = 0;

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#D4A373';
        ctx.strokeRect(x, y, size, size);
        
        ctx.drawImage(qrCanvas, x + (size*0.05), y + (size*0.05), size*0.9, size*0.9);
      }
    }

    // 5. Draw Footer
    if (transforms.footer.visible) {
      const centerX = (transforms.footer.x / 100) * canvas.width;
      const centerY = (transforms.footer.y / 100) * canvas.height;

      if (customFooter) {
        const footerImg = new Image();
        footerImg.src = customFooter;
        await new Promise(r => { footerImg.onload = r; footerImg.onerror = r; });
        
        if (footerImg.complete && footerImg.naturalWidth > 0) {
          const dw = canvas.width * transforms.footer.scale;
          const dh = dw * (footerImg.height / footerImg.width);
          ctx.drawImage(footerImg, centerX - dw/2, centerY - dh/2, dw, dh);
        }
      } else if (!customBg || (customBg && !backgrounds.find(b => b.url === customBg))) {
        // Only show default footer if no custom background or it's not a preset that might already have branding
        const footerH = canvas.height * 0.15;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, centerY - footerH/2, canvas.width, footerH);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.floor(footerH * 0.25 * transforms.footer.scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('PicPhotoShare', centerX, centerY + (footerH * 0.15));
      }
    }
  };

  useEffect(() => {
    if (previewCanvasRef.current) {
      drawOnCanvas(previewCanvasRef.current);
    }
  }, [transforms, eventName, eventDate, customBg, customFooter, eventPhotoUrl, customMessage]);

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (typeof window !== 'undefined') {
        const toast = document.createElement('div');
        toast.innerText = 'Enviando imagens...';
        toast.className = 'fixed bottom-4 right-4 bg-[#D4A373] text-white px-4 py-2 rounded shadow-lg z-[9999] transition-opacity duration-300';
        toast.id = 'uploading-toast';
        document.body.appendChild(toast);
      }

      const uploadedBackgrounds: Array<{id: string, name: string, url: string}> = [];
      const failedBackgrounds: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          if (!response.ok) throw new Error('Upload server error');
          const data = await response.json();
          uploadedBackgrounds.push({
            id: `custom-${Date.now()}-${i}`,
            name: file.name.replace(/\.[^/.]+$/, ""),
            url: `/api/image/${data.id}`
          });
        } catch (e: any) {
          console.error("Error uploading background", file.name, e);
          failedBackgrounds.push(file.name);
        }
      }

      const toast = document.getElementById('uploading-toast');
      if (toast) {
        if (failedBackgrounds.length > 0) {
           toast.innerText = 'Alguns arquivos falharam ao enviar.';
           toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-[9999] transition-opacity duration-300';
        } else {
           toast.innerText = 'Modelos enviados com sucesso!';
           toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-[9999] transition-opacity duration-300';
        }
        setTimeout(() => toast.remove(), 3000);
      }

      if (uploadedBackgrounds.length > 0) {
        if (onUpdateCustomBackgrounds) {
          onUpdateCustomBackgrounds([...uploadedBackgrounds, ...customBackgrounds]);
        } else {
          setBackgrounds(prev => [...uploadedBackgrounds, ...prev]);
        }
        setCustomBg(uploadedBackgrounds[uploadedBackgrounds.length - 1].url);
      }
    }
  };

  const handleFooterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCustomFooter(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const exportLarge = async () => {
    setIsGenerating(true);
    const exportCanvas = document.createElement('canvas');
    // 15cm x 18cm em 300 DPI
    exportCanvas.width = 1772;
    exportCanvas.height = 2126;
    await drawOnCanvas(exportCanvas, true);
    
    const link = document.createElement('a');
    link.download = `display-custom-${inviteCode}.jpg`;
    link.href = exportCanvas.toDataURL('image/jpeg', 0.95);
    link.click();
    setIsGenerating(false);
  };

  const appUrl = `${window.location.origin}/?invite=${inviteCode}`;

  const ControlGroup = ({ id, label, icon: Icon }: { id: keyof typeof transforms, label: string, icon: React.ElementType }) => {
    const isText = id === 'name' || id === 'date' || id === 'message';
    const config = transforms[id] as any;

    return (
      <div className={`rounded-xl transition-all ${activeElement === id ? 'menu-btn-active' : 'menu-btn-inactive border border-gray-100'}`}>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setActiveElement(id);
          }}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <Icon size={16} className={activeElement === id ? 'text-[#D4A373]' : 'text-gray-400'} />
            <span className={`text-sm font-semibold ${activeElement === id ? 'text-[#D4A373]' : 'text-gray-600'}`}>{label}</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer scale-75" onClick={e => e.stopPropagation()}>
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={config.visible} 
              onChange={e => setTransforms({...transforms, [id]: {...config, visible: e.target.checked}})}
            />
            <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#D4A373]"></div>
          </label>
        </button>

        {activeElement === id && config.visible && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-1 px-4 pb-4 mt-1 border-t border-gray-100/50 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-gray-400 font-bold uppercase">
                  <span>Horizontal</span>
                  <span>{config.x}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" 
                  value={config.x} 
                  onChange={e => setTransforms({...transforms, [id]: {...config, x: parseInt(e.target.value)}})}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#D4A373]"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-gray-400 font-bold uppercase">
                  <span>Vertical</span>
                  <span>{config.y}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" 
                  value={config.y} 
                  onChange={e => setTransforms({...transforms, [id]: {...config, y: parseInt(e.target.value)}})}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#D4A373]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-gray-400 font-bold uppercase">
                <span>Escala</span>
                <span>{config.scale.toFixed(1)}x</span>
              </div>
              <input 
                type="range" min="0.1" max="2.5" step="0.1"
                value={config.scale} 
                onChange={e => setTransforms({...transforms, [id]: {...config, scale: parseFloat(e.target.value)}})}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#D4A373]"
              />
            </div>

            {isText && (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                {id === 'message' && (
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 font-bold uppercase">Texto da Mensagem</label>
                    <textarea 
                      value={customMessage}
                      onChange={e => setCustomMessage(e.target.value)}
                      className="w-full p-2 bg-gray-50 border rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#D4A373] min-h-[60px] resize-none"
                      placeholder="Digite sua mensagem personalizada..."
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-400 font-bold uppercase">Tipografia</label>
                  <select 
                    value={config.fontFamily}
                    onChange={e => setTransforms({...transforms, [id]: {...config, fontFamily: e.target.value}})}
                    className="w-full p-2 bg-gray-50 border rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#D4A373]"
                  >
                    {fonts.map(f => (
                      <option key={f.value} value={f.value}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 font-bold uppercase">Tamanho</label>
                    <input 
                      type="number" step="0.1"
                      value={config.fontSize} 
                      onChange={e => setTransforms({...transforms, [id]: {...config, fontSize: parseFloat(e.target.value)}})}
                      className="w-full p-2 bg-gray-50 border rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 font-bold uppercase">Cor</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={config.color} 
                        onChange={e => setTransforms({...transforms, [id]: {...config, color: e.target.value}})}
                        className="w-6 h-6 rounded border p-0 cursor-pointer"
                      />
                      <span className="text-[9px] text-gray-500 font-mono uppercase">{config.color}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button 
                    onClick={() => setTransforms({...transforms, [id]: {...config, bold: !config.bold}})}
                    className={`p-1.5 rounded border transition-all ${config.bold ? 'btn-gold border-[#D4A373]' : 'btn-beige text-gray-400'}`}
                  >
                    <Bold size={12} />
                  </button>
                  <button 
                    onClick={() => setTransforms({...transforms, [id]: {...config, italic: !config.italic}})}
                    className={`p-1.5 rounded border transition-all ${config.italic ? 'btn-gold border-[#D4A373]' : 'btn-beige text-gray-400'}`}
                  >
                    <Italic size={12} />
                  </button>
                  <button 
                    onClick={() => setTransforms({...transforms, [id]: {...config, shadow: !config.shadow}})}
                    className={`p-1.5 rounded border transition-all ${config.shadow ? 'btn-gold border-[#D4A373]' : 'btn-beige text-gray-400'}`}
                  >
                    <Layers size={12} />
                  </button>
                  <button 
                    onClick={() => setTransforms({...transforms, [id]: {...config, uppercase: !config.uppercase}})}
                    className={`px-2 py-1 rounded border text-[8px] font-bold transition-all ${config.uppercase ? 'btn-gold border-[#D4A373]' : 'btn-beige text-gray-400'}`}
                  >
                    ABC
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-6">
      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* Editor Toolbar (Left Sidebar) */}
        <div className="w-full xl:w-20 xl:h-[720px] flex xl:flex-col gap-2 bg-white rounded-2xl p-2 shadow-sm border shrink-0">
          <button 
            onClick={() => setActiveTab('bg')}
            className={`flex-1 xl:flex-none p-3 rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'bg' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
          >
            <ImageIcon size={20} />
            <span className="text-[9px] font-bold uppercase">Fundo</span>
          </button>
          <button 
            onClick={() => setActiveTab('elements')}
            className={`flex-1 xl:flex-none p-3 rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'elements' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
          >
            <Move size={20} />
            <span className="text-[9px] font-bold uppercase">Objetos</span>
          </button>
          <button 
            onClick={() => setActiveTab('styles')}
            className={`flex-1 xl:flex-none p-3 rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'styles' ? 'menu-btn-active' : 'menu-btn-inactive'}`}
          >
            <Palette size={20} />
            <span className="text-[9px] font-bold uppercase">Estilos</span>
          </button>
          <div className="xl:mt-auto hidden xl:block border-t border-gray-100 pt-2">
            <button 
              onClick={resetTransforms}
              className="p-3 text-gray-300 hover:text-red-400 rounded-xl transition-all flex flex-col items-center gap-1 w-full"
              title="Resetar"
            >
              <RotateCcw size={18} />
              <span className="text-[9px] font-bold uppercase">Limpar</span>
            </button>
          </div>
        </div>

        {/* Preview Area (Center) */}
        <div className="flex-1 flex flex-col items-center gap-6">
          <div className="relative group">
            <div className="absolute -inset-4 bg-[#D4A373]/5 rounded-[2.5rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative bg-white p-4 rounded-[2rem] shadow-2xl border border-gray-100">
              <div className="aspect-[15/18] w-full max-w-[500px] shadow-inner overflow-hidden rounded-xl border relative">
                <canvas 
                  ref={previewCanvasRef} 
                  width={900} 
                  height={1080} 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 w-full max-w-[500px]">
            <button
              onClick={exportLarge}
              disabled={isGenerating}
              className="flex-1 btn-gold px-8 py-4 rounded-2xl font-bold shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Download size={20} />
              )}
              Exportar Display
            </button>
          </div>
        </div>

        {/* Settings Panel (Right) */}
        <div className="w-full xl:w-[400px] shrink-0 bg-white rounded-3xl p-6 shadow-sm border h-[720px] flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <h3 className="text-lg font-serif">Ajustes do Projeto</h3>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded-full font-bold uppercase">15x18cm</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-6">
            {activeTab === 'bg' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Galeria de Eventos</label>
                    <div className="flex gap-4">
                      {customBackgrounds && customBackgrounds.length > 0 && (
                        <button 
                          onClick={() => {
                            if (window.confirm('Tem certeza que deseja apagar todos os fundos personalizados?')) {
                              if (onUpdateCustomBackgrounds) onUpdateCustomBackgrounds([]);
                              setCustomBg(backgrounds?.[0]?.url || null);
                            }
                          }}
                          className="text-[10px] text-red-500 font-bold flex items-center gap-1 hover:underline"
                        >
                          <Trash2 size={12} /> LIMPAR TODOS
                        </button>
                      )}
                      <button 
                        onClick={() => document.getElementById('bg-upload')?.click()}
                        className="text-[10px] text-[#D4A373] font-bold flex items-center gap-1 hover:underline"
                      >
                        <Upload size={12} /> NOVO
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {backgrounds.map((bg) => (
                      <div key={bg.id} className="relative group aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all border-gray-100 hover:border-amber-200 shadow-sm">
                        <button
                          onClick={() => setCustomBg(bg.url)}
                          className={`w-full h-full ${customBg === bg.url ? 'ring-4 ring-amber-50 border-[#D4A373]' : ''}`}
                        >
                          <img src={bg.url} className="w-full h-full object-cover" alt={bg.name} />
                          {customBg === bg.url && (
                            <div className="absolute top-2 left-2 bg-[#D4A373] text-white p-1 rounded-full z-10">
                              <Check size={12} />
                            </div>
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-[9px] text-white p-2 font-medium">
                            {bg.name}
                          </div>
                        </button>
                        {bg.id.startsWith('custom-') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              
                              if (onUpdateCustomBackgrounds) {
                                onUpdateCustomBackgrounds(customBackgrounds.filter(b => b.id !== bg.id));
                              } else {
                                setBackgrounds(prev => prev.filter(b => b.id !== bg.id));
                              }
  
                              if (customBg === bg.url) {
                                setCustomBg(backgrounds.find(b => b.id !== bg.id)?.url || null);
                              }
                            }}
                            className="absolute top-2 right-2 bg-red-500/90 text-white p-1 rounded-full lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-20 hover:bg-red-600"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <input id="bg-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleBgUpload} />
                </div>
              </div>
            )}

            {activeTab === 'elements' && (
              <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Organizar Elementos</label>
                <ControlGroup id="name" label="Título do Evento" icon={Type} />
                <ControlGroup id="message" label="Mensagem Personalizada" icon={MessageSquare} />
                <ControlGroup id="date" label="Data Especial" icon={Calendar} />
                <ControlGroup id="photo" label="Foto Redonda" icon={Camera} />
                <ControlGroup id="qr" label="Código QR" icon={QrCode} />
                <ControlGroup id="footer" label="Logo/Rodapé" icon={Layers} />
              </div>
            )}

            {activeTab === 'styles' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sua Marca</label>
                  <div 
                    onClick={() => document.getElementById('footer-upload')?.click()}
                    className={`group w-full h-32 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center relative overflow-hidden ${customFooter ? 'border-[#D4A373] bg-amber-50/30' : 'border-gray-200 hover:border-[#D4A373] bg-gray-50'}`}
                  >
                    {customFooter ? (
                      <div className="relative w-full h-full flex items-center justify-center p-4">
                        <img src={customFooter} className="max-h-full max-w-full object-contain drop-shadow-sm" />
                        <div className="absolute inset-0 bg-black/40 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">Alterar Logo</div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-300 group-hover:text-[#D4A373]">
                        <div className="p-3 bg-white rounded-full shadow-sm border border-gray-100 group-hover:border-[#D4A373]/30">
                          <ImageIcon size={24} />
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold uppercase tracking-tight">Upload de Logo</p>
                          <p className="text-[9px] opacity-70">PNG ou JPG recomendado</p>
                        </div>
                      </div>
                    )}
                    <input id="footer-upload" type="file" accept="image/*" className="hidden" onChange={handleFooterUpload} />
                  </div>
                  {customFooter && (
                    <button 
                      onClick={() => setCustomFooter(null)} 
                      className="text-[9px] text-red-500 font-bold hover:bg-red-50 w-full py-1 rounded-lg transition-colors border border-transparent hover:border-red-100 uppercase tracking-wider"
                    >
                      Remover Logo Personalizado
                    </button>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 italic text-[10px] text-gray-500 leading-relaxed">
                  Combine os estilos e o fundo para criar algo único. O display final terá qualidade profissional de gráfica.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Invisible QR */}
        <div ref={qrRef} className="hidden">
          <QRCodeCanvas value={appUrl} size={1024} level="H" includeMargin={false} />
        </div>
      </div>
    </div>
  );
}
