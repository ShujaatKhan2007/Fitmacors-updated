/**
 * imageResize.js
 * ---------------
 * Resizes an image file in the browser before uploading it, using a
 * canvas element. This keeps photos from a phone camera (which can be
 * several MB) down to a small, fast-to-upload size without needing any
 * external library.
 */

const MAX_DIMENSION = 1024; // pixels, on the longer side
const JPEG_QUALITY = 0.82;

/**
 * Reads an image File, resizes it so its longest side is at most
 * MAX_DIMENSION pixels, and returns it as base64-encoded JPEG data
 * (without the "data:image/jpeg;base64," prefix) plus its MIME type.
 *
 * @param {File} file
 * @returns {Promise<{base64: string, mimeType: string}>}
 */
export function resizeImageForUpload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Could not read the selected file."));

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error("Could not load the selected image."));

      img.onload = () => {
        let { width, height } = img;

        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        // Strip the "data:image/jpeg;base64," prefix - the backend only
        // wants the raw base64 data plus the mime type separately.
        const base64 = dataUrl.split(",")[1];

        resolve({ base64, mimeType: "image/jpeg", previewUrl: dataUrl });
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}
