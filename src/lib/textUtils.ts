/**
 * Shared text utility functions
 */

/**
 * Normalizes text by removing accents/diacritics and converting to lowercase
 */
export const normalizeText = (text: string | null | undefined): string => {
  if (!text) return "";
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};
