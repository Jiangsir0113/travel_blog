import imageCompression from "browser-image-compression";

const compressedImageType = "image/webp";

export async function compressTripImage(file: File): Promise<File> {
  const compressedFile = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1600,
    fileType: compressedImageType,
    useWebWorker: true,
  });

  return new File([compressedFile], replaceFileExtension(file.name, "webp"), {
    type: compressedImageType,
    lastModified: Date.now(),
  });
}

function replaceFileExtension(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  return `${baseName || "trip-image"}.${extension}`;
}
