import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, ZoomIn, ZoomOut, RotateCcw, Check, X, Trash2, Image as ImageIcon } from 'lucide-react';

export function isCustomAvatar(avatar?: string | null): boolean {
  if (!avatar || typeof avatar !== 'string') return false;
  const trimmed = avatar.trim();
  if (!trimmed) return false;
  if (trimmed.includes('picsum.photos')) return false;
  return true;
}

export function getAvatarFallbackUrl(name?: string | null): string {
  const cleanName = (name || 'Usuario').trim() || 'U';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0f172a&color=a3e635&bold=true&size=256`;
}

export function getMemberAvatarUrl(
  member?: { name?: string; avatar?: string } | null,
  fallbackName?: string
): string {
  if (member && isCustomAvatar(member.avatar)) {
    return member.avatar!;
  }
  return getAvatarFallbackUrl(member?.name || fallbackName);
}

interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedDataUrl: string) => Promise<void> | void;
  currentAvatar?: string;
  personName?: string;
  title?: string;
}

const VIEWPORT_SIZE = 260;
const OUTPUT_SIZE = 300;

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentAvatar,
  personName = 'Usuario',
  title = 'Foto de Perfil Cuadrada (1:1)',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setImageSrc(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setErrorMsg(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  const baseScale = naturalSize.width > 0 && naturalSize.height > 0
    ? Math.max(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height)
    : 1;

  const effectiveScale = baseScale * zoom;

  const clampOffset = useCallback(
    (nextX: number, nextY: number, currentZoom: number = zoom) => {
      if (naturalSize.width === 0 || naturalSize.height === 0) return { x: 0, y: 0 };
      const scale = baseScale * currentZoom;
      const scaledW = naturalSize.width * scale;
      const scaledH = naturalSize.height * scale;
      const maxX = Math.max(0, (scaledW - VIEWPORT_SIZE) / 2);
      const maxY = Math.max(0, (scaledH - VIEWPORT_SIZE) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, nextX)),
        y: Math.min(maxY, Math.max(-maxY, nextY)),
      };
    },
    [naturalSize, baseScale, zoom]
  );

  const handleFileObject = (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('La imagen supera el tamaño máximo de 15 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setImageSrc(result);
      };
      img.onerror = () => {
        setErrorMsg('No se pudo cargar la imagen seleccionada.');
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileObject(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileObject(file);
    }
  };

  const handleZoomChange = (nextZoom: number) => {
    const clampedZoom = Math.min(3, Math.max(1, nextZoom));
    setZoom(clampedZoom);
    setOffset(prev => clampOffset(prev.x, prev.y, clampedZoom));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageSrc) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !imageSrc) return;
    const nextX = e.clientX - dragStart.x;
    const nextY = e.clientY - dragStart.y;
    setOffset(clampOffset(nextX, nextY));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!imageSrc || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !imageSrc || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const nextX = touch.clientX - dragStart.x;
    const nextY = touch.clientY - dragStart.y;
    setOffset(clampOffset(nextX, nextY));
  };

  const handleSaveCropped = async () => {
    if (!imageRef.current || !imageSrc) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo inicializar el procesador gráfico.');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fill background in case PNG has transparency
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;
      const drawW = naturalSize.width * effectiveScale * ratio;
      const drawH = naturalSize.height * effectiveScale * ratio;
      const drawX = (OUTPUT_SIZE - drawW) / 2 + offset.x * ratio;
      const drawY = (OUTPUT_SIZE - drawH) / 2 + offset.y * ratio;

      ctx.drawImage(imageRef.current, drawX, drawY, drawW, drawH);

      let dataUrl = canvas.toDataURL('image/webp', 0.86);
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.86);
      }

      await onSave(dataUrl);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar la foto de perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onSave('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al quitar la foto de perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const hasExistingCustomPhoto = isCustomAvatar(currentAvatar);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-ng-lime text-ng-black flex items-center justify-center shadow-sm">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">{title}</h3>
              <p className="text-[11px] text-gray-400 font-medium truncate max-w-[240px]">
                {personName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {!imageSrc ? (
            <div className="space-y-4">
              {/* Current Preview + Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 hover:border-ng-lime bg-gray-50/70 hover:bg-ng-lime/5 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <div className="relative mb-4">
                  <img
                    src={hasExistingCustomPhoto ? currentAvatar! : getAvatarFallbackUrl(personName)}
                    alt={personName}
                    className="w-28 h-28 rounded-2xl aspect-square object-cover shadow-md border-2 border-white ring-4 ring-gray-100"
                  />
                  <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-ng-lime text-ng-black flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Upload size={16} />
                  </div>
                </div>

                <p className="text-xs font-black text-gray-800 uppercase tracking-wider mb-1">
                  Haz clic o arrastra tu foto aquí
                </p>
                <p className="text-[11px] text-gray-500 max-w-xs">
                  Formato cuadrado <span className="font-bold text-gray-700">1:1</span> automático para todo el ERP (JPG, PNG o WebP).
                </p>
              </div>

              {hasExistingCustomPhoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={isSaving}
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 size={14} />
                  Quitar foto actual y usar iniciales
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Interactive 1:1 Crop Viewport */}
              <div className="flex flex-col items-center">
                <div
                  style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUp}
                  onWheel={(e) => {
                    e.preventDefault();
                    const delta = e.deltaY < 0 ? 0.1 : -0.1;
                    handleZoomChange(zoom + delta);
                  }}
                  className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-inner border-2 border-slate-900 cursor-grab active:cursor-grabbing select-none touch-none"
                >
                  <img
                    src={imageSrc}
                    alt="Recorte 1:1"
                    draggable={false}
                    style={{
                      width: naturalSize.width * effectiveScale,
                      height: naturalSize.height * effectiveScale,
                      maxWidth: 'none',
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                    }}
                    className="pointer-events-none select-none"
                  />

                  {/* Subtle 1:1 Rule-of-Thirds Grid */}
                  <div className="absolute inset-0 pointer-events-none border-2 border-ng-lime/70 rounded-2xl">
                    <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                      <div className="border-r border-b border-white/25" />
                      <div className="border-r border-b border-white/25" />
                      <div className="border-b border-white/25" />
                      <div className="border-r border-b border-white/25" />
                      <div className="border-r border-b border-white/25" />
                      <div className="border-b border-white/25" />
                      <div className="border-r border-white/25" />
                      <div className="border-r border-white/25" />
                      <div />
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-gray-400 mt-2">
                  Arrastra la imagen para encuadrar • Formato 1:1
                </span>
              </div>

              {/* Zoom & Change Image Controls */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleZoomChange(zoom - 0.15)}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 cursor-pointer"
                    title="Alejar"
                  >
                    <ZoomOut size={15} />
                  </button>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.02}
                    value={zoom}
                    onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                    className="flex-1 accent-slate-900 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => handleZoomChange(zoom + 0.15)}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 cursor-pointer"
                    title="Acercar"
                  >
                    <ZoomIn size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setOffset({ x: 0, y: 0 });
                    }}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-900 cursor-pointer"
                    title="Restablecer encuadre"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ImageIcon size={13} />
                    Elegir otra imagen
                  </button>
                  <span className="text-[10px] font-black text-gray-400 uppercase">
                    Zoom {(zoom * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          {imageSrc && (
            <button
              type="button"
              onClick={handleSaveCropped}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-ng-lime text-ng-black text-xs font-black uppercase tracking-wider hover:brightness-105 shadow-md shadow-ng-lime/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check size={16} />
              {isSaving ? 'Guardando...' : 'Aplicar Foto Cuadrada'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
