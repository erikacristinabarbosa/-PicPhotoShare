import React from 'react';
import { Mail, Phone, Globe } from 'lucide-react';

export default function Footer({ isLogin }: { isLogin?: boolean }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`w-full mt-auto py-12 px-6 relative border-t font-outfit ${isLogin ? 'bg-black border-white/10 text-white' : 'bg-gradient-to-b from-[#fdfbf7] to-[#f5f2ed] border-[#D4A373]/10 text-[#4a4a4a]'}`}>
      <div className="max-w-7xl mx-auto relative z-10">
       {/* Contact Section - Centered */}
<div className="flex flex-col items-center gap-8 mb-12 text-center">
  <div className="flex flex-col items-center gap-6">
    <h4 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-3 justify-center ${isLogin ? 'text-[#D4AF37]' : 'text-[#D4A373]'}`}>
      <span className={`w-8 h-[1px] ${isLogin ? 'bg-[#D4AF37]/40' : 'bg-[#D4A373]/40'}`}></span>
      Contato
      <span className={`w-8 h-[1px] ${isLogin ? 'bg-[#D4AF37]/40' : 'bg-[#D4A373]/40'}`}></span>
    </h4>
    <ul className="flex flex-col gap-5 items-start">
      <li className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-sm group ${isLogin ? 'bg-white/10 border-white/20 hover:border-[#D4AF37]/50' : 'bg-[#D4A373]/5 border-[#D4A373]/20 hover:border-[#D4A373]'}`}>
          <Phone size={16} className={`transition-colors ${isLogin ? 'text-[#D4AF37] group-hover:text-[#D4AF37]/80' : 'text-[#D4A373] group-hover:text-[#BF953F]'}`} />
        </div>
        <span className={`text-sm font-medium ${isLogin ? 'text-white' : 'text-[#2d2d2d]'}`}>(19) 92010-3269</span>
      </li>
      <li className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-sm group ${isLogin ? 'bg-white/10 border-white/20 hover:border-[#D4AF37]/50' : 'bg-[#D4A373]/5 border-[#D4A373]/20 hover:border-[#D4A373]'}`}>
          <Mail size={16} className={`transition-colors ${isLogin ? 'text-[#D4AF37] group-hover:text-[#D4AF37]/80' : 'text-[#D4A373] group-hover:text-[#BF953F]'}`} />
        </div>
        <span className={`text-sm font-medium ${isLogin ? 'text-white' : 'text-[#2d2d2d]'}`}>comercial@picphotoshare.com.br</span>
      </li>
      <li className="flex items-center gap-4">
        <a href="https://www.picphotoshare.com.br" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-sm ${isLogin ? 'bg-white/10 border-white/20 group-hover:border-[#D4AF37]/50' : 'bg-[#D4A373]/5 border-[#D4A373]/20 group-hover:border-[#D4A373]'}`}>
            <Globe size={16} className={`transition-colors ${isLogin ? 'text-[#D4AF37] group-hover:text-[#D4AF37]/80' : 'text-[#D4A373] group-hover:text-[#BF953F]'}`} />
          </div>
          <span className={`text-sm font-medium ${isLogin ? 'text-white' : 'text-[#2d2d2d]'}`}>www.picphotoshare.com.br</span>
        </a>
      </li>
    </ul>
  </div>
</div>
        {/* Separator Line */}
        <div className={`w-full h-[1px] mb-8 ${isLogin ? 'bg-gradient-to-r from-transparent via-white/30 to-transparent' : 'bg-gradient-to-r from-transparent via-[#D4A373]/20 to-transparent'}`}></div>

        {/* Copyright */}
        <div className={`text-[10px] text-center tracking-[0.2em] uppercase pb-4 font-medium ${isLogin ? 'text-white/80' : 'text-[#8c8c8c]'}`}>
          <p>© {currentYear} ECB Digital. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

