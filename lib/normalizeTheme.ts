export const THEME_MIN_LENGTH = 2;
export const THEME_MAX_LENGTH = 80;

/** Texto para exibição: preserva o que foi digitado, só tira bordas e espaços duplicados. */
export function cleanTheme(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function isValidTheme(theme: string): boolean {
  return theme.length >= THEME_MIN_LENGTH && theme.length <= THEME_MAX_LENGTH;
}
