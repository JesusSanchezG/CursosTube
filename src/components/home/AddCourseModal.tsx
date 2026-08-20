import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Check, AlertCircle, Layers } from 'lucide-react';
import { Modal } from '../common/Modal';
import { parseYouTubeUrl, fetchVideoOEmbed, fetchPlaylistData } from '../../services/youtube';
import type { Course } from '../../types/course';

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCourse: (url: string, customTitle?: string) => Promise<Course>;
  apiKey?: string;
}

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen,
  onClose,
  onAddCourse,
  apiKey,
}) => {
  const [url, setUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    type: 'playlist' | 'video';
    title: string;
    channelTitle: string;
    thumbnailUrl: string;
    videoCount?: number;
  } | null>(null);
  // Si el usuario ya escribió su propio título, no lo sobreescribimos
  const titleTouchedRef = useRef(false);

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setUrl('');
      setCustomTitle('');
      setError(null);
      setPreview(null);
      setIsLoadingPreview(false);
      setIsSubmitting(false);
      titleTouchedRef.current = false;
    }
  }, [isOpen]);

  // Handle URL change & auto-preview with debounce
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      setPreview(null);
      setError(null);
      return;
    }

    const parsed = parseYouTubeUrl(trimmed);
    if (!parsed.isValid) {
      setPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingPreview(true);
      setError(null);
      try {
        if (parsed.playlistId) {
          const plData = await fetchPlaylistData(parsed.playlistId, apiKey);
          setPreview({
            type: 'playlist',
            title: plData.title,
            channelTitle: plData.channelTitle,
            thumbnailUrl: plData.thumbnailUrl,
            videoCount: plData.videos.length
          });
        } else if (parsed.videoId) {
          const vMeta = await fetchVideoOEmbed(parsed.videoId);
          setPreview({
            type: 'video',
            title: vMeta.title,
            channelTitle: vMeta.authorName,
            thumbnailUrl: vMeta.thumbnailUrl,
            videoCount: 1
          });
        }
      } catch (err: any) {
        console.error('Preview error:', err);
      } finally {
        setIsLoadingPreview(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [url, apiKey]);

  // Auto-fill the title field with the fetched title (only if untouched)
  useEffect(() => {
    if (preview && !titleTouchedRef.current) {
      setCustomTitle(preview.title);
    }
  }, [preview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = parseYouTubeUrl(url);
    if (!parsed.isValid) {
      setError('Por favor introduce un enlace válido de YouTube (video o lista de reproducción).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddCourse(url, customTitle.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al importar el curso de YouTube.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
      }
    } catch {
      // Ignore if clipboard permission not allowed
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Añadir nuevo curso de YouTube"
      subtitle="Pega la URL de una lista de reproducción o de un video individual"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* URL Input */}
        <div>
          <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider mb-1.5">
            Enlace de YouTube
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3 text-[#736d5a] pointer-events-none flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=... o video"
              className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-[#eeede6] border border-[#dedcd3] focus:border-[#0a192f] focus:ring-1 focus:ring-[#0a192f] text-sm text-[#0a192f] placeholder-[#938c75] transition-all outline-none"
              autoFocus
              required
            />
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="absolute right-2 px-2.5 py-1 text-xs font-medium bg-[#e2e0d5] hover:bg-[#dedcd3] text-[#0a192f] rounded-lg transition-colors"
            >
              Pegar
            </button>
          </div>
        </div>

        {/* Loading Preview */}
        {isLoadingPreview && (
          <div className="flex items-center gap-2 text-xs text-[#736d5a] py-2">
            <Loader2 className="w-4 h-4 animate-spin text-sky-700" />
            <span>Extrayendo información de YouTube...</span>
          </div>
        )}

        {/* Live Preview Card */}
        {preview && !isLoadingPreview && (
          <div className="rounded-xl bg-[#eeede6] border border-[#dedcd3] p-3 flex gap-3 items-center animate-in fade-in duration-200">
            <img
              src={preview.thumbnailUrl}
              alt={preview.title}
              className="w-20 h-14 object-cover rounded-lg bg-[#0a192f] shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#0a192f] text-white">
                  {preview.type === 'playlist' ? 'Playlist' : 'Video'}
                </span>
                {preview.videoCount !== undefined && (
                  <span className="text-xs text-[#736d5a]">
                    {preview.videoCount} {preview.videoCount === 1 ? 'lección' : 'lecciones'}
                  </span>
                )}
              </div>
              <h4 className="text-xs font-semibold text-[#0a192f] line-clamp-1">
                {preview.title}
              </h4>
              <p className="text-[11px] text-[#736d5a] line-clamp-1">
                {preview.channelTitle}
              </p>
            </div>
          </div>
        )}

        {/* Custom Title Input */}
        <div>
          <label className="block text-xs font-semibold text-[#0a192f] uppercase tracking-wider mb-1.5">
            Título del Curso <span className="text-[#736d5a] font-normal lowercase">(opcional)</span>
          </label>
          <input
            type="text"
            value={customTitle}
            onChange={(e) => {
              titleTouchedRef.current = true;
              setCustomTitle(e.target.value);
            }}
            placeholder="Puedes personalizar el título del curso"
            className="w-full px-3.5 py-2 rounded-xl bg-[#eeede6] border border-[#dedcd3] focus:border-[#0a192f] focus:ring-1 focus:ring-[#0a192f] text-sm text-[#0a192f] placeholder-[#938c75] transition-all outline-none"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2.5 text-red-800 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="leading-snug">{error}</div>
          </div>
        )}

        {/* Info Box */}
        <div className="rounded-xl bg-[#e5e4de]/60 border border-[#dedcd3] p-3 text-[11px] text-[#555043] space-y-1">
          <p className="font-semibold text-[#0a192f] flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-sky-800" />
            Formatos soportados:
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-1 text-[#736d5a]">
            <li>Playlists completas de cursos</li>
            <li>Videos largos individuales (3-10 horas)</li>
            <li>Enlaces cortos (youtu.be)</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#dedcd3]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#555043] hover:text-[#0a192f] hover:bg-[#e2e0d5] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !url.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0a192f] hover:bg-[#132b50] text-white text-xs font-semibold shadow-sm active:scale-98 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-sky-300" />
                <span>Importando curso...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-sky-300" />
                <span>Guardar y Comenzar</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
