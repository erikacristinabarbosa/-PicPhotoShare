import React, { useState, useEffect } from 'react';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, setDoc, onSnapshot, query, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Users, Lock, Trash2, Mail, Clock, ShieldCheck, Edit2, Check, X } from 'lucide-react';

interface GuestUser {
  id: string;
  name: string;
  contact?: string;
  createdAt: any;
}

interface AdminUser {
  id: string;
  email: string;
  createdAt: string;
}

export default function AdminManager() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [guests, setGuests] = useState<GuestUser[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [isDeletingAllGuests, setIsDeletingAllGuests] = useState(false);
  const [confirmDeleteAllGuests, setConfirmDeleteAllGuests] = useState(false);
  const [confirmDeleteGuest, setConfirmDeleteGuest] = useState<string | null>(null);

  const handleDeleteGuest = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'guest_users', id));
      setMessage('Convidado removido com sucesso!');
      setConfirmDeleteGuest(null);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error("Error deleting guest:", err);
      setError(`Erro ao remover convidado: ${err.message}`);
    }
  };

  const handleDeleteAllGuests = async () => {
    setIsDeletingAllGuests(true);
    try {
      const q = query(collection(db, 'guest_users'));
      // Note: For large collections, we'd need batching, but for this use-case loop is okay
      const snapshot = guests; // from state for simply doing it
      for (const guest of snapshot) {
        await deleteDoc(doc(db, 'guest_users', guest.id));
      }
      setMessage('Todos os convidados removidos com sucesso!');
      setConfirmDeleteAllGuests(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error("Error deleting all guests:", err);
      setError(`Erro ao remover convidados: ${err.message}`);
    } finally {
      setIsDeletingAllGuests(true);
    }
  };
  const [editingGuest, setEditingGuest] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Re-initialize secondary app to create user without overriding current user's session
  const secondaryApp = getApps().find(app => app.name === "Secondary") || initializeApp(firebaseConfig, "Secondary");
  const secondaryAuth = getAuth(secondaryApp);

  useEffect(() => {
    const q = query(collection(db, 'admins'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adminsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminUser[];
      setAdmins(adminsList);
    });

    const qGuests = query(collection(db, 'guest_users'));
    const unsubscribeGuests = onSnapshot(qGuests, (snapshot) => {
      const guestsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GuestUser[];
      
      guestsList.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setGuests(guestsList);
    });

    const qLogs = query(collection(db, 'admin_logs'), orderBy('timestamp', 'desc'));
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      const logsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAdminLogs(logsList);
    });

    return () => {
      unsubscribe();
      unsubscribeGuests();
      unsubscribeLogs();
    };
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      // Wait for it to finish then implicitly clear secondary session
      await signOut(secondaryAuth);
      
      // Store reference in firestore to list admins easily
      await setDoc(doc(db, 'admins', userCredential.user.uid), {
        email: userCredential.user.email,
        createdAt: new Date().toISOString()
      });
      
      setMessage('Administrador cadastrado com sucesso!');
      setEmail('');
      setPassword('');
      
      setTimeout(() => setMessage(''), 5000);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use' || (err.message && err.message.includes('email-already-in-use'))) {
        setError('Este e-mail já está sendo usado por outro administrador.');
        console.log('User already exists:', err.message);
      } else if (err.code === 'auth/invalid-email' || (err.message && err.message.includes('invalid-email'))) {
        setError('E-mail inválido.');
      } else if (err.code === 'auth/weak-password' || (err.message && err.message.includes('weak-password'))) {
        setError('A senha é muito fraca (mínimo 6 caracteres).');
      } else {
        console.error(err);
        setError(err.message || 'Erro ao cadastrar administrador.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, 'admins', id));
      setMessage('Acesso revogado com sucesso!');
      setConfirmDelete(null);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error("Error deleting admin:", err);
      setError(`Erro ao remover administrador: ${err.message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUpdatePin = async (guestId: string) => {
    if (newPin.length < 4) {
      setPinError('O PIN deve ter no mínimo 4 caracteres.');
      return;
    }
    
    try {
      setPinError('');
      await updateDoc(doc(db, 'guest_users', guestId), {
        pin: newPin
      });
      setMessage('PIN do usuário atualizado com sucesso!');
      setEditingGuest(null);
      setNewPin('');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error("Error updating pin:", err);
      setPinError(`Erro ao atualizar PIN: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
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
              className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 btn-gold rounded-xl font-medium disabled:opacity-50"
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} className="text-purple-500" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Administradores Ativos</h3>
              <p className="text-sm text-gray-500 mt-0.5">Lista de contas com acesso ao painel.</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
            {admins.length} {admins.length === 1 ? 'Admin' : 'Admins'}
          </span>
        </div>

        <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
          {admins.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              Nenhum administrador cadastrado.
            </div>
          ) : (
            admins.map((admin) => (
              <div key={admin.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-blue-500 transition-colors">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{admin.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                      <Clock size={12} />
                      {new Date(admin.createdAt).toLocaleDateString('pt-BR')} às {new Date(admin.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {confirmDelete === admin.id ? (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                      <button
                        onClick={() => handleDeleteAdmin(admin.id)}
                        disabled={isDeleting === admin.id}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="btn-beige px-3 py-1.5 rounded-lg text-xs font-bold"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(admin.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all lg:opacity-0 lg:group-hover:opacity-100"
                      title="Remover acesso"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Seção de Usuários */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <Users size={20} className="text-orange-500" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Usuários Cadastrados</h3>
              <p className="text-sm text-gray-500 mt-0.5">Lista de convidados que acessaram a plataforma (podem alterar PIN).</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold whitespace-nowrap">
            {guests.length} {guests.length === 1 ? 'Usuário' : 'Usuários'}
          </span>
        </div>

        {guests.length > 0 && (
          <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
            <span className="text-sm text-gray-600">Ações em massa</span>
            {confirmDeleteAllGuests ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteAllGuests}
                  disabled={isDeletingAllGuests}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                >
                  Confirmar Exclusão Total
                </button>
                <button
                  onClick={() => setConfirmDeleteAllGuests(false)}
                  className="btn-beige px-3 py-1.5 rounded-lg text-xs font-bold"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteAllGuests(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
              >
                <Trash2 size={14} />
                Excluir Todos
              </button>
            )}
          </div>
        )}

        <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
          {guests.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              Nenhum usuário cadastrado ainda.
            </div>
          ) : (
            guests.map((guest) => (
              <div key={guest.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors group gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{guest.name} {guest.contact && <span className="text-xs text-gray-400 font-normal ml-2">- {guest.contact}</span>}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                      <Clock size={12} />
                      {guest.createdAt ? (
                        <>{new Date(guest.createdAt.toDate ? guest.createdAt.toDate() : guest.createdAt).toLocaleDateString('pt-BR')} às {new Date(guest.createdAt.toDate ? guest.createdAt.toDate() : guest.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>
                      ) : '...'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-end w-full sm:w-auto">
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    {confirmDeleteGuest === guest.id ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleDeleteGuest(guest.id)}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmDeleteGuest(null)}
                          className="p-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          title="Cancelar"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : editingGuest === guest.id ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex flex-col relative w-full sm:w-auto">
                          <input
                            type="text"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            placeholder="Novo PIN"
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-full sm:w-32 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                          {pinError && <span className="text-[10px] text-red-500 absolute top-full left-0 mt-1 whitespace-nowrap">{pinError}</span>}
                        </div>
                        <button
                          onClick={() => handleUpdatePin(guest.id)}
                          className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors shrink-0"
                          title="Salvar"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => { setEditingGuest(null); setNewPin(''); setPinError(''); }}
                          className="p-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors shrink-0"
                          title="Cancelar"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingGuest(guest.id); setNewPin(''); setPinError(''); }}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-transparent hover:border-orange-100"
                        >
                          <Edit2 size={14} />
                          Alterar PIN
                        </button>
                        <button
                          onClick={() => setConfirmDeleteGuest(guest.id)}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Seção de Logs de Administradores */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <Clock size={20} className="text-teal-500" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Logs de Acesso Administrativo</h3>
              <p className="text-sm text-gray-500 mt-0.5">Histórico de logins dos administradores.</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold whitespace-nowrap">
            {adminLogs.length} {adminLogs.length === 1 ? 'Login' : 'Logins'}
          </span>
        </div>

        <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
          {adminLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              Nenhum log de acesso registrado ainda.
            </div>
          ) : (
            adminLogs.map((log) => (
              <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors group gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{log.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                      <Clock size={12} />
                      {log.timestamp ? (
                        <>{new Date(log.timestamp.toDate ? log.timestamp.toDate() : log.timestamp).toLocaleDateString('pt-BR')} às {new Date(log.timestamp.toDate ? log.timestamp.toDate() : log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>
                      ) : '...'}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
