const fs = require('fs');

let content = fs.readFileSync('src/components/Login.tsx', 'utf8');

const mainReturnRegex = /return \(\n\s+<div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-\[#1a0510\].*$/s;

const newUI = `return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1a0510] via-[#3a0a1f] to-[#12030a] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[60%] h-[60%] bg-orange-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-rose-700/20 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-[400px] px-6 z-10 flex flex-col items-center flex-1 justify-center">
        <div className="flex flex-col items-center text-center space-y-4 mb-4 pt-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-[#B38728] via-[#FCF6BA] to-[#BF953F] p-1 shadow-[0_0_30px_rgba(191,149,63,0.3)] flex items-center justify-center">
             <div className="w-full h-full bg-[#1a0510] rounded-full flex items-center justify-center relative overflow-hidden">
               <img src="/logo.png" alt="Logo" className="w-[85%] h-[85%] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }} />
               <Camera size={40} className="text-[#D4A373] relative z-10 hidden" />
             </div>
          </div>
          <h1 className="text-4xl sm:text-[2.75rem] font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#D4A373] via-[#FCF6BA] to-[#D4A373] drop-shadow-lg tracking-wide py-1">
            PicPhotoShare
          </h1>
          <p className="text-white/80 font-medium text-sm px-4 leading-relaxed tracking-wide">
            Onde cada momento vira uma celebração compartilhada!
          </p>
        </div>

        <div className="w-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.1] rounded-[2.5rem] p-6 shadow-2xl relative mb-8 relative">
          
          <div className="flex justify-center mb-6">
            <span className="px-6 py-2 bg-gradient-to-r from-white/[0.05] to-white/[0.15] rounded-full text-white/90 font-bold tracking-widest text-sm shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/10 uppercase">
              ENTRAR
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 flex flex-col items-center w-full">
            
            <div className="relative w-full group">
              <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#D4A373]/70 group-focus-within:text-[#D4A373] transition-colors" />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white/[0.05] border border-white/10 text-white placeholder-white/40 focus:bg-white/[0.08] focus:border-[#D4A373]/50 focus:ring-1 focus:ring-[#D4A373]/50 outline-none transition-all text-[15px]"
                placeholder="Nome Completo"
                required
              />
            </div>

            <div className="relative w-full group">
              <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#D4A373]/70 group-focus-within:text-[#D4A373] transition-colors" />
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white/[0.05] border border-white/10 text-white placeholder-white/40 focus:bg-white/[0.08] focus:border-[#D4A373]/50 focus:ring-1 focus:ring-[#D4A373]/50 outline-none transition-all text-[15px]"
                placeholder="E-mail ou Telefone"
                required
              />
            </div>
            
            <div className="relative w-full group">
              <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#D4A373]/70 group-focus-within:text-[#D4A373] transition-colors" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 rounded-full bg-white/[0.05] border border-white/10 text-white placeholder-white/40 focus:bg-white/[0.08] focus:border-[#D4A373]/50 focus:ring-1 focus:ring-[#D4A373]/50 outline-none transition-all text-[15px]"
                placeholder="Senha"
                required
              />
              <EyeOff size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer transition-colors" />
            </div>

            <div className="relative w-full group">
              <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#D4A373]/70 group-focus-within:text-[#D4A373] transition-colors" />
              <input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white/[0.05] border border-white/10 text-white placeholder-white/40 focus:bg-white/[0.08] focus:border-[#D4A373]/50 focus:ring-1 focus:ring-[#D4A373]/50 outline-none transition-all text-[15px]"
                placeholder="PIN"
              />
            </div>

            <div className="relative w-full group">
              <Ticket size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#D4A373]/70 group-focus-within:text-[#D4A373] transition-colors" />
              <input
                id="code"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white/[0.05] border border-white/10 text-white placeholder-white/40 focus:bg-white/[0.08] focus:border-[#D4A373]/50 focus:ring-1 focus:ring-[#D4A373]/50 outline-none transition-all text-[15px]"
                placeholder="Código do Convite"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 text-rose-300 rounded-2xl text-[13px] border border-rose-500/30 flex flex-col gap-2 w-full mt-2 backdrop-blur-md">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div className="pt-2 w-full">
              <div className="border border-white/10 rounded-[1.25rem] p-3 bg-gradient-to-b from-white/[0.02] to-white/[0.05]">
                <button
                  type="button"
                  onClick={() => setIsScanning(true)}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-4 flex items-center justify-center gap-3 transition-colors text-white/90 text-[15px] tracking-wide"
                >
                  <QrCode size={22} className="text-[#D4A373]" />
                  Ler QR Code
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-pink-600 via-rose-500 to-[#eab308] text-white rounded-full py-4 text-base font-bold uppercase tracking-[0.15em] shadow-[0_4px_25px_rgba(244,63,94,0.4)] hover:brightness-110 transition-all active:scale-[0.98]"
            >
              {loading ? 'Aguarde...' : 'ENTRAR'}
            </button>
          </form>
        </div>
      </div>
      
      <div className="w-full z-10 shrink-0">
        <Footer settings={settings as Settings} />
      </div>

      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md">
          <button
            onClick={() => setIsScanning(false)}
            className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <X size={24} />
          </button>
          
          <div className="w-full max-w-sm">
            <h3 className="text-white text-center font-medium text-lg mb-6 tracking-wide uppercase">Ler QR Code</h3>
            <div className="relative rounded-[2rem] overflow-hidden border-2 border-[#D4A373]/50 shadow-[0_0_30px_rgba(212,163,115,0.2)] bg-black">
              <div id="reader" className="w-full min-h-[300px]"></div>
            </div>
            <p className="text-center text-white/50 text-sm mt-6 font-light">
              Aponte a câmera para o QR Code do convite
            </p>
          </div>
        </div>
      )}
    </div>
  );
}`;

content = content.replace(mainReturnRegex, newUI);

const handleLoginStart = content.indexOf('const handleLogin = async (e: React.FormEvent) => {');
const handleLoginEndRegex = /login\(guestId,.*?\n\s+\}/s;
const match = handleLoginEndRegex.exec(content.substring(handleLoginStart));

if (handleLoginStart !== -1 && match) {
  const newHandleLogin = `const handleLogin = async (e: React.FormEvent) => {
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
      const nameParts = trimmedName.split(/\\s+/);
      if (nameParts.length < 2 || nameParts[0].length < 2 || nameParts[1].length < 2) {
        throw new Error('Por favor, insira nome e sobrenome.');
      }

      const trimmedEmail = email.trim();
      if (!trimmedEmail) throw new Error('Por favor, insira seu E-mail ou Telefone.');
      
      const trimmedPassword = password.trim();
      if (!trimmedPassword) throw new Error('Por favor, insira sua senha.');

      const formattedName = formatName(trimmedName);
      // Normalize email/phone for ID: lowercased, unaccented, alphanumerics only
      const guestId = trimmedEmail.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      
      const pwdHash = await hashPassword(trimmedPassword);
      const userRef = doc(db, 'guest_users', guestId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.password !== pwdHash && userData.password !== trimmedPassword && userData.pin !== trimmedPassword) {
          throw new Error('Senha incorreta.');
        }
        login(formattedName || userData.name, trimmedEmail);
      } else {
        await setDoc(userRef, {
          name: formattedName || trimmedEmail,
          contact: trimmedEmail,
          password: pwdHash,
          pin: pin,
          createdAt: serverTimestamp()
        });
        login(formattedName || trimmedEmail, trimmedEmail);
      }`;
  const endIndex = handleLoginStart + match.index + match[0].length;
  content = content.substring(0, handleLoginStart) + newHandleLogin + content.substring(endIndex);
}

// also we need to add name state and Footer import
let toAddImports = '';
if (!content.includes('import Footer')) {
  toAddImports = "import Footer from './Footer';\n";
}
if (!content.includes("const [name, setName]")) {
  content = content.replace(/const \[email, setEmail\] = useState\(''\);/, "const [name, setName] = useState('');\n  const [email, setEmail] = useState('');");
}

fs.writeFileSync('src/components/Login.tsx', toAddImports + content);
