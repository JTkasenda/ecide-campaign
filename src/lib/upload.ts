/**
 * Préparation des fichiers envoyés depuis l'espace membre (photo, pièce d'identité, listes de présence).
 *
 * Les envois passent par le relais du site (/api/membre/…). Hébergé sur Vercel, ce relais refuse
 * toute requête de plus de 4,5 Mo. Une photo prise au téléphone pèse souvent 3 à 8 Mo : elle est
 * réduite dans le navigateur (2 000 pixels au plus, JPEG), ce qui suffit à lire une pièce d'identité
 * et allège l'envoi sur les connexions lentes. Les autres fichiers (PDF, CSV, XLSX) partent tels quels,
 * dans la limite de RELAY_MAX_MO.
 */

/** Taille maximale d'un fichier envoyé par le relais (4 Mo : marge sous la limite de 4,5 Mo de Vercel). */
export const RELAY_MAX_MO = 4;

const MAX_SIDE = 2000;
const QUALITY = 0.85;
/** En dessous de ce poids, une image déjà petite n'est pas retouchée. */
const KEEP_BELOW = 1.5 * 1024 * 1024;

/** Limite effective : celle du serveur, sans dépasser celle du relais. */
export function uploadLimitMo(serverMaxMo: number): number {
  return Math.min(serverMaxMo || RELAY_MAX_MO, RELAY_MAX_MO);
}

/**
 * Réduit une photo trop lourde ou trop grande. Renvoie le fichier d'origine s'il n'y a rien à faire,
 * si ce n'est pas une image que le navigateur sait lire (HEIC hors Safari, par exemple) ou si la
 * réduction ne l'allège pas.
 */
export async function prepareUpload(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) || typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= KEEP_BELOW) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // Fond blanc : une image PNG transparente ne devient pas noire en JPEG
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", QUALITY));
  if (!blob || blob.size >= file.size) return file;
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
}
