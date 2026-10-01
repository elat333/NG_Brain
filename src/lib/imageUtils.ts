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
 * Procesa y optimiza una imagen a resolución máxima de 1080p.
 * Si supera 1080p, muestra un aviso al usuario y redimensiona proporcionalmente a Full HD.
 */
export const validateAndOptimizeImage = (
  file: File,
  notifyOnResize: boolean = true
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
        const origW = img.width;
        const origH = img.height;
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

          if (notifyOnResize) {
            alert(`ℹ️ Optimización de imagen:\nLa imagen seleccionada tiene una resolución alta (${origW}×${origH} px) superior a 1080p.\nSe optimizó automáticamente a ${width}×${height} px (Full HD) para mantener la velocidad y rendimiento del sistema.`);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas ctx not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a WebP o JPEG optimizado
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/webp';
        const dataUrl = canvas.toDataURL(mimeType, 0.85);

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
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen seleccionada'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen'));
    reader.readAsDataURL(file);
  });
};

export const uploadImageToStorage = async (
  file: File,
  path: string = 'task_references',
  notifyOnResize: boolean = true
): Promise<string> => {
  try {
    const { file: optimizedFile } = await validateAndOptimizeImage(file, notifyOnResize);
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const storageRef = ref(storage, `${path}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`);
    const snapshot = await uploadBytes(storageRef, optimizedFile);
    return await getDownloadURL(snapshot.ref);
  } catch (err) {
    console.warn('Fallback a subida directa tras error de optimización:', err);
    const fileExt = file.name.split('.').pop() || 'jpg';
    const storageRef = ref(storage, `${path}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  }
};

export const processAndCompressImage = async (file: File): Promise<string> => {
  const res = await validateAndOptimizeImage(file, true);
  return res.dataUrl;
};
