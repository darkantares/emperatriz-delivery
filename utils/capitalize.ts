// utils/capitalize.ts

/**
 * Capitaliza la primera letra de cada palabra en un string.
 * @param text El texto a capitalizar
 * @returns El texto capitalizado
 */
export function Capitalize(text: string): string {
  if (!text) return '';
  return text.replace(/\b\w/g, char => char.toUpperCase());
}
