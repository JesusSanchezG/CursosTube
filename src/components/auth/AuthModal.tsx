import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Check, Mail, Lock, User as UserIcon, Cloud } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setInfo(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email.trim() || !password) {
      setError('Completa el correo y la contraseña.');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result =
        mode === 'login'
          ? await signIn(email.trim(), password)
          : await signUp(email.trim(), password, name);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.needsEmailConfirmation) {
        setInfo('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.');
        setMode('login');
      } else {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
      subtitle="Sincroniza tus cursos, progreso y apuntes entre dispositivos"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Tabs */}
        <div className="inline-flex rounded-xl bg-[#dedcd3] p-0.5 text-xs font-medium w-full">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
              mode === 'login'
                ? 'bg-[#0a192f] text-white shadow-xs'
                : 'text-[#555043] hover:text-[#0a192f]'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
              mode === 'register'
                ? 'bg-[#0a192f] text-white shadow-xs'
                : 'text-[#555043] hover:text-[#0a192f]'
            }`}
          >
            Crear cuenta
          </button>
        </div>

        {/* Name (only register) */}
        {mode === 'register' && (
          <div className="relative">
            <UserIcon className="w-4 h-4 text-[#736d5a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre (opcional)"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#eeede6] border border-[#dedcd3] focus:border-[#0a192f] text-sm text-[#0a192f] placeholder-[#938c75] outline-none transition-all"
            />
          </div>
        )}

        {/* Email */}
        <div className="relative">
          <Mail className="w-4 h-4 text-[#736d5a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            autoComplete="email"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#eeede6] border border-[#dedcd3] focus:border-[#0a192f] text-sm text-[#0a192f] placeholder-[#938c75] outline-none transition-all"
            required
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock className="w-4 h-4 text-[#736d5a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'Contraseña (mínimo 6 caracteres)' : 'Contraseña'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#eeede6] border border-[#dedcd3] focus:border-[#0a192f] text-sm text-[#0a192f] placeholder-[#938c75] outline-none transition-all"
            required
          />
        </div>

        {/* Error / Info messages */}
        {error && (
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {info && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{info}</span>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#dedcd3]">
          <span className="text-[11px] text-[#736d5a] flex items-center gap-1">
            <Cloud className="w-3 h-3 text-sky-700" />
            Supabase &bull; tus datos están protegidos
          </span>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0a192f] hover:bg-[#132b50] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-sky-300" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-sky-300" />
                <span>{mode === 'login' ? 'Entrar y sincronizar' : 'Crear cuenta'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
