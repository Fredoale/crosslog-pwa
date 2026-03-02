import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

const MAX_DIMENSION = 1024; // px
const JPEG_QUALITY = 0.72;

/**
 * Comprime una imagen a máx 1024px y la sube a Firebase Storage.
 * Retorna la URL pública de descarga.
 *
 * Reduce fotos de celular de ~5MB base64 a ~80–150KB.
 */
export async function compressAndUploadImage(file: File, storagePath: string): Promise<string> {
  // 1. Cargar imagen en un elemento <img>
  const objectUrl = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = objectUrl;
  });
  URL.revokeObjectURL(objectUrl);

  // 2. Calcular dimensiones manteniendo relación de aspecto
  let { naturalWidth: w, naturalHeight: h } = img;
  if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
    if (w >= h) {
      h = Math.round((h / w) * MAX_DIMENSION);
      w = MAX_DIMENSION;
    } else {
      w = Math.round((w / h) * MAX_DIMENSION);
      h = MAX_DIMENSION;
    }
  }

  // 3. Dibujar en canvas y comprimir a JPEG
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob falló'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });

  // 4. Subir a Firebase Storage y retornar URL
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}
