import React from 'react';
import { Mail, Phone, Globe } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mt-auto py-12 px-6 relative bg-gradient-to-b from-[#fdfbf7] to-[#f5f2ed] border-t border-[#D4A373]/10 text-[#4a4a4a] font-outfit">
      <div className="max-w-7xl mx-auto relative z-10">
       {/* Contact Section - Centered */}
<div className="flex flex-col items-center gap-8 mb-12 text-center">
  <div className="flex flex-col items-center gap-6">
    <h4 className="text-[#D4A373] text-sm font-bold uppercase tracking-widest flex items-center gap-3 justify-center">
      <span className="w-8 h-[1px] bg-[#D4A373]/40"></span>
      Contato
      <span className="w-8 h-[1px] bg-[#D4A373]/40"></span>
    </h4>
    <ul className="flex flex-col gap-5 items-start">
      <li className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-[#D4A373]/5 flex items-center justify-center border border-[#D4A373]/20 group hover:border-[#D4A373] transition-all cursor-pointer shadow-sm">
          <Phone size={16} className="text-[#D4A373] group-hover:text-[#BF953F] transition-colors" />
        </div>
        <span className="text-sm font-medium text-[#2d2d2d]">(19) 92010-3269</span>
      </li>
      <li className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-[#D4A373]/5 flex items-center justify-center border border-[#D4A373]/20 group hover:border-[#D4A373] transition-all cursor-pointer shadow-sm">
          <Mail size={16} className="text-[#D4A373] group-hover:text-[#BF953F] transition-colors" />
        </div>
        <span className="text-sm font-medium text-[#2d2d2d]">comercial@picphotoshare.com.br</span>
      </li>
      <li className="flex items-center gap-4">
        <a href="https://www.picphotoshare.com.br" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
          <div className="w-10 h-10 rounded-full bg-[#D4A373]/5 flex items-center justify-center border border-[#D4A373]/20 group-hover:border-[#D4A373] transition-all cursor-pointer shadow-sm">
            <Globe size={16} className="text-[#D4A373] group-hover:text-[#BF953F] transition-colors" />
          </div>
          <span className="text-sm font-medium text-[#2d2d2d]">www.picphotoshare.com.br</span>
        </a>
      </li>
    </ul>
  </div>
</div>
        {/* Separator Line */}
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#D4A373]/20 to-transparent mb-8"></div>

        {/* Copyright */}
        <div className="text-[10px] text-[#8c8c8c] text-center tracking-[0.2em] uppercase pb-4 font-medium">
          <p>© {currentYear} ECB Digital. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

