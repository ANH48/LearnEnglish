/**
 * Shrinks a photo in the browser before upload (in place of a service such as TinyPNG):
 * the longest side becomes at most MAX_SIDE pixels and the file is re-encoded as JPEG,
 * lowering the quality until it fits. 1600 px keeps handwriting sharp enough to read.
 * Browser only (canvas).
 */

const MAX_SIDE = 1600;
const QUALITIES = [0.82, 0.72, 0.6, 0.5];

export async function shrinkImage(file: Blob, maxBytes: number): Promise<Blob> {
  // from-image applies the phone's rotation, so a portrait photo is not stored sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available.");
    // JPEG has no transparency: paint white first so a transparent PNG does not turn black.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of QUALITIES) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= maxBytes) return blob;
    }
    throw new Error("Image is still too large after shrinking.");
  } finally {
    bitmap.close();
  }
}
