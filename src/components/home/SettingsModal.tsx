import React, { useState } from 'react';
import { Key, Play, Download, Upload, Check, AlertCircle, ShieldCheck, Cloud, LogIn, LogOut } from 'lucide-react';
import { Modal } from '../common/Modal';
import type { UserSettings } from '../../types/course';
import { getAllProgress, getSavedCourses, saveCourses, saveAllProgress } from '../../services/storage';
import type { User } from '@supabase/supabase-js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  user: User | null;
  isSignedIn: boolean;
  onSignOut: () => Promise<void>;
  onOpenAuthModal: () => void;
  lastSyncError: string | null;
  lastSyncAt: number | null;
  remoteStats: { courses: number; progress: number; error: string | null };
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  user,
  isSignedIn,
  onSignOut,
  onOpenAuthModal,
  lastSyncError,
  lastSyncAt,
  remoteStats,
}) => {
  const [apiKey, setApiKey] = useState(settings.youtubeApiKey || '');
  const [autoPlayNext, setAutoPlayNext] = useState(settings.autoPlayNext);
  const [autoPlayDelaySeconds, setAutoPlayDelaySeconds] = useState(settings.autoPlayDelaySeconds || 1);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      youtubeApiKey: apiKey.trim() || undefined,
      autoPlayNext,
      autoPlayDelaySeconds: Number(autoPlayDelaySeconds) || 1,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  // Export JSON backup
  const handleExportBackup = () => {
    const backupData = {
      courses: getSavedCourses(),
      progress: getAllProgress(),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cursos_youtube_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (Array.isArray(data.courses) && data.progress) {
          saveCourses(data.courses);
          saveAllProgress(data.progress);
          setImportMessage({
            type: 'success',
            text: `¡Copia de seguridad restaurada con éxito! Se cargaron ${data.courses.length} cursos.`
          });
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          setImportMessage({
            type: 'error',
            text: 'El archivo no tiene el formato de copia de seguridad esperado.'
          });
        }
      } catch {
        setImportMessage({
          type: 'error',
          text: 'Error al procesar el archivo JSON.'
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuración y Almacenamiento"
      subtitle="Ajustes de reproducción, API y respaldo en tu navegador"
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="space-y-6">
        {/* Account / Sync */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[#0a192f] uppercase tracking-wider flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-sky-700" />
            Cuenta y sincronización
          </h4>

          {isSignedIn ? (
            <div className="p-3 rounded-xl bg-[#eeede6] border border-[#dedcd3]">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-[#0a192f] block truncate">
                    {user?.user_metadata?.display_name || 'Usuario'}
                  </span>
                  <span className="text-[11px] text-[#736d5a] block truncate">{user?.email}</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await onSignOut();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e2e0d5] hover:bg-red-100 hover:text-red-700 text-xs font-medium text-[#555043] transition-colors shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Salir
                </button>
              </div>
              <p className="text-[11px] text-emerald-700 mt-2 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Tus cursos, progreso y notas se sincronizan en la nube.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#eeede6] border border-[#dedcd3]">
              <p className="text-[11px] text-[#736d5a] leading-relaxed mb-2">
                Inicia sesión para guardar tus cursos y progreso en la nube y continuar desde cualquier dispositivo.
              </p>
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a192f] hover:bg-[#132b50] text-white text-xs font-semibold transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-300" />
                Iniciar sesión / Crear cuenta
              </button>
            </div>
          )}

          {/* Diagnóstico de sincronización (con sesión) */}
          {isSignedIn && user && (
            <div className="p-3 rounded-xl bg-[#e5e4de]/60 border border-[#dedcd3] text-[11px] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#0a192f]">Cuenta</span>
                <span className="text-[#736d5a] truncate ml-2">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#0a192f]">ID de usuario</span>
                <span className="text-[#736d5a] font-mono text-[10px] truncate ml-2">
                  {(user.id || '').slice(0, 8)}…
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#0a192f]">Cursos en la nube</span>
                <span className="text-[#736d5a]">
                  {remoteStats.error ? (
                    <span className="text-red-700">{remoteStats.error}</span>
                  ) : (
                    `${remoteStats.courses} cursos · ${remoteStats.progress} progreso`
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#0a192f]">Última sincronización</span>
                <span className="text-[#736d5a]">
                  {lastSyncError ? (
                    <span className="text-red-700">Error</span>
                  ) : lastSyncAt ? (
                    new Date(lastSyncAt).toLocaleTimeString()
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <p className="text-[10px] text-[#736d5a] pt-1 border-t border-[#dedcd3]/70">
                Si el ID de usuario difiere entre dispositivos, son cuentas distintas y los datos no se comparten.
              </p>
            </div>
          )}
        </div>

        {/* Playback Settings */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[#0a192f] uppercase tracking-wider flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-sky-700" />
            Reproducción y Continuidad
          </h4>

          {/* Autoplay toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#eeede6] border border-[#dedcd3]">
            <div>
              <span className="text-xs font-semibold text-[#0a192f] block">
                Reproducir siguiente lección automáticamente
              </span>
              <span className="text-[11px] text-[#736d5a]">
                Al terminar un video, avanza solo al siguiente
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoPlayNext}
              onChange={(e) => setAutoPlayNext(e.target.checked)}
              className="w-4 h-4 accent-[#0a192f] cursor-pointer"
            />
          </div>

          {/* Autoplay Delay */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#eeede6] border border-[#dedcd3]">
            <div>
              <span className="text-xs font-semibold text-[#0a192f] block">
                Tiempo de espera entre videos (segundos)
              </span>
              <span className="text-[11px] text-[#736d5a]">
                Espera antes de iniciar el siguiente video (defecto: 1 segundo)
              </span>
            </div>
            <input
              type="number"
              min="0"
              max="10"
              value={autoPlayDelaySeconds}
              onChange={(e) => setAutoPlayDelaySeconds(Number(e.target.value))}
              className="w-16 px-2 py-1 text-xs text-center font-semibold rounded-lg bg-[#f5f5f0] border border-[#dedcd3] text-[#0a192f] focus:outline-none focus:border-[#0a192f]"
            />
          </div>
        </div>

        {/* YouTube API Key (Optional) */}
        <div className="space-y-2 pt-2 border-t border-[#dedcd3]">
          <h4 className="text-xs font-bold text-[#0a192f] uppercase tracking-wider flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-sky-700" />
            YouTube Data API v3 (Opcional)
          </h4>
          <p className="text-[11px] text-[#736d5a] leading-relaxed">
            La app funciona gratis sin clave API. Si añades tu clave personal de Google Cloud, podrás obtener metadatos más completos de playlists gigantes.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full px-3 py-2 rounded-xl bg-[#eeede6] border border-[#dedcd3] focus:border-[#0a192f] text-xs text-[#0a192f] placeholder-[#938c75] outline-none"
          />
        </div>

        {/* Backup & Restore */}
        <div className="space-y-2 pt-2 border-t border-[#dedcd3]">
          <h4 className="text-xs font-bold text-[#0a192f] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            Copia de Seguridad (LocalStorage)
          </h4>
          <p className="text-[11px] text-[#736d5a]">
            Todos tus cursos, marcas de progreso y apuntes se guardan localmente en tu navegador. Puedes exportarlos en cualquier momento.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleExportBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e2e0d5] hover:bg-[#dedcd3] border border-[#dedcd3] text-xs font-medium text-[#0a192f] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Copia (JSON)</span>
            </button>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e2e0d5] hover:bg-[#dedcd3] border border-[#dedcd3] text-xs font-medium text-[#0a192f] transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Importar Copia</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>

          {importMessage && (
            <div
              className={`p-2.5 rounded-lg text-xs mt-2 flex items-center gap-2 ${
                importMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {importMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{importMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[#dedcd3]">
          <span className="text-[11px] text-[#736d5a]">
            {savedSuccess ? '¡Cambios guardados!' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#555043] hover:text-[#0a192f] hover:bg-[#e2e0d5] transition-colors"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0a192f] hover:bg-[#132b50] text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Check className="w-3.5 h-3.5 text-sky-300" />
              <span>Guardar Ajustes</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
