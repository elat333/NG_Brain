import { storage, ref, uploadBytes, getDownloadURL } from './firebase';

export interface ImageOptimizationResult {
  file: File | Blob;
  dataUrl: string;
  wasResized: boolean;
  originalWidth: number;
  originalHeight: number;
  optimizedWidth: number;
  optimizedHeight: number;
}

/**
 * Procesa y optimiza una imagen a resolución máxima de 1080p sin bloquear el hilo con alerts.
 * Si supera 1080p, la redimensiona proporcionalmente a Full HD manteniendo aspecto y calidad.
 */
export const validateAndOptimizeImage = (
  file: File,
  _notifyOnResize: boolean = false
): Promise<ImageOptimizationResult> => {
  return new Promise((resolve, reject) => {
    // Validar tipo
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo seleccionado no es una imagen válida.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 1080;
        const origW = img.width || 1080;
        const origH = img.height || 1080;
        let width = origW;
        let height = origH;
        let wasResized = false;

        if (width > MAX_SIZE || height > MAX_SIZE) {
          wasResized = true;
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback a dataUrl original
          const rawUrl = e.target?.result as string;
          resolve({
            file,
            dataUrl: rawUrl,
            wasResized: false,
            originalWidth: origW,
            originalHeight: origH,
            optimizedWidth: origW,
            optimizedHeight: origH,
          });
          return;
        }

        // Suavizado de alta calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Formato WebP con fallback a JPEG
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, 0.85);

        try {
          canvas.toBlob(
            (blob) => {
              const finalBlob = blob || file;
              resolve({
                file: finalBlob,
                dataUrl,
                wasResized,
                originalWidth: origW,
                originalHeight: origH,
                optimizedWidth: width,
                optimizedHeight: height,
              });
            },
            mimeType,
            0.85
          );
        } catch {
          // Si toBlob falla, resolver con dataUrl y archivo original
          resolve({
            file,
            dataUrl,
            wasResized,
            originalWidth: origW,
            originalHeight: origH,
            optimizedWidth: width,
            optimizedHeight: height,
          });
        }
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen seleccionada'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen'));
    reader.readAsDataURL(file);
  });
};

/**
 * Sube una imagen a Firebase Storage con compresión a 1080p, timeout seguro y fallback garantizado a dataUrl.
 */
export const uploadImageToStorage = async (
  file: File,
  path: string = 'task_references',
  _notifyOnResize: boolean = false
): Promise<string> => {
  try {
    const { file: optimizedFile, dataUrl } = await validateAndOptimizeImage(file, false);
    
    // Intentar subida a Firebase Storage con un timeout de 6 segundos
    try {
      const isPng = file.type === 'image/png';
      const fileExt = isPng ? 'png' : 'jpg';
      const storageRef = ref(storage, `${path}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`);
      
      const uploadPromise = uploadBytes(storageRef, optimizedFile);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Storage upload timeout (6s)')), 6000)
      );

      const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl || dataUrl;
    } catch (storageErr) {
      console.warn('Firebase Storage no disponible o tardío, utilizando base64 optimizado Full HD:', storageErr);
      return dataUrl;
    }
  } catch (err) {
    console.error('Error procesando imagen, usando lectura directa:', err);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }
};

export const processAndCompressImage = async (file: File): Promise<string> => {
  const res = await validateAndOptimizeImage(file, false);
  return res.dataUrl;
};
