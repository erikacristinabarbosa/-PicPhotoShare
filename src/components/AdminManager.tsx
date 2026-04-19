import React, { useState } from 'react';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Users, Lock } from 'lucide-react';

export default function AdminManager() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Re-initialize secondary app to create user without overriding current user's session
  // Check if app already exists to avoid "Firebase App named 'Secondary' already exists" error
  const secondaryApp = getApps().find(app => app.name === "Secondary") || initializeApp(firebaseConfig, "Secondary");
  const secondaryAuth = getAuth(secondaryApp);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      // Wait for it to finish then implicitly clear secondary session
      await signOut(secondaryAuth);
      
      // Store reference in firestore to list admins easily if needed later
      await setDoc(doc(db, 'admins', userCredential.user.uid), {
        email: userCredential.user.email,
        createdAt: new Date().toISOString()
      });
      
      setMessage('Administrador cadastrado com sucesso!');
      setEmail('');
      setPassword('');
      
      setTimeout(() => setMessage(''), 5000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao cadastrar administrador. Verifique as regras de senha.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <Users size={20} className="text-blue-500" />
        </div>
        <div>
          <h2 className="text-xl font-medium text-gray-900">Cadastrar Novo Administrador</h2>
          <p className="text-sm text-gray-500 mt-1">Crie contas adicionais para ajudar na moderação do evento.</p>
        </div>
      </div>
      
      <form onSubmit={handleRegister} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A373] focus:bg-white transition-colors"
              required
              placeholder="admin2@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha (Mín. 6 caracteres)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A373] focus:bg-white transition-colors"
              required
              minLength={6}
              placeholder="••••••"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}
        
        {message && (
          <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-green-600 text-sm">
            {message}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Processando...</>
            ) : (
              <><Lock size={16} />Criar acesso administrativo</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
