export async function compressImage(file: File, maxWidth = 1920, quality = 0.85): Promise<File> {
  // Only compress images
  if (!file.type.startsWith('image/')) return file;
  
  // Don't compress GIFs as it would remove animation
  if (file.type === 'image/gif') return file;

  // Don't compress very small images
  if (file.size < 500 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // Fallback to original if canvas fails
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file); // Fallback
          return;
        }
        
        // Create new file preserving original name
        const compressedFile = new File([blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        
        // If somehow the compressed file is larger, use the original
        if (compressedFile.size > file.size) {
           resolve(file);
        } else {
           resolve(compressedFile);
        }
      }, 'image/jpeg', quality);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // Fallback to original on error
    };
    
    img.src = url;
  });
}
