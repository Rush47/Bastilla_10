export interface ProcessedFile {
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  textContent?: string;
}

/**
 * Safely processes and optimizes uploaded files for UI preview and text extraction.
 * Text files are read up to 50,000 characters.
 */
export async function processUploadFile(file: File): Promise<ProcessedFile> {
  if (file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawUrl = (e.target?.result as string) || '';
        // If image is reasonably small (< 800 KB) and not an SVG, keep as is
        if (file.size <= 800 * 1024 || file.type.includes('svg')) {
          resolve({
            name: file.name,
            type: file.type || 'image/png',
            size: file.size,
            dataUrl: rawUrl,
          });
          return;
        }

        // Optimize large photo/graphic using Canvas
        const img = new Image();
        img.onload = () => {
          const maxDim = 1920;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              dataUrl: rawUrl,
            });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const optimizedDataUrl = canvas.toDataURL(mime, 0.85);
          const approxBytes = Math.round((optimizedDataUrl.length * 3) / 4);

          resolve({
            name: file.name,
            type: mime,
            size: approxBytes,
            dataUrl: optimizedDataUrl,
          });
        };

        img.onerror = () => {
          resolve({
            name: file.name,
            type: file.type || 'image/jpeg',
            size: file.size,
            dataUrl: rawUrl,
          });
        };

        img.src = rawUrl;
      };

      reader.onerror = () => {
        resolve({
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
        });
      };

      reader.readAsDataURL(file);
    });
  }

  // Text/code/log files
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      resolve({
        name: file.name,
        type: file.type || 'text/plain',
        size: file.size,
        textContent: text.slice(0, 50000),
      });
    };
    reader.onerror = () => {
      resolve({
        name: file.name,
        type: file.type || 'text/plain',
        size: file.size,
      });
    };
    reader.readAsText(file);
  });
}
