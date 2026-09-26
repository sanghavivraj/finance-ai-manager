/**
 * Client-Side Image Compression Utility
 * Resizes images to max 1000px width/height and compresses to under 500KB using HTML5 Canvas.
 */

export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1000,
    maxHeight = 1500,
    maxSizeKB = 500,
    initialQuality = 0.85,
    minQuality = 0.5,
  } = options;

  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not a valid image.'));
    }

    const originalSizeKB = (file.size / 1024).toFixed(1);
    const reader = new FileReader();

    reader.onerror = (err) => reject(new Error('Failed to read image file: ' + err.message));

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for processing.'));

      img.onload = () => {
        // 1. Calculate aspect-ratio-preserving dimensions
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // 2. Draw onto Canvas with high-quality smoothing
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw white background in case of transparent PNG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // 3. Iteratively compress to meet maxSizeKB
        let quality = initialQuality;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Calculate byte size from base64 string
        let byteLength = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4);
        let sizeKB = byteLength / 1024;

        while (sizeKB > maxSizeKB && quality > minQuality) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          byteLength = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4);
          sizeKB = byteLength / 1024;
        }

        const base64Data = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
        const compressedSizeKB = sizeKB.toFixed(1);
        const savingsPercent = Math.max(0, Math.round((1 - (sizeKB / (file.size / 1024))) * 100));

        resolve({
          dataUrl,
          base64: base64Data,
          mimeType: 'image/jpeg',
          width,
          height,
          originalSizeKB: parseFloat(originalSizeKB),
          compressedSizeKB: parseFloat(compressedSizeKB),
          savingsPercent,
          quality: Math.round(quality * 100),
        });
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });
}
