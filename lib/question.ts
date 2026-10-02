import { modelQuestion } from "./i18n";

/** Pergunta exibida na resposta da API (sempre em português; independe do idioma da UI). */
export function buildModelQuestion(theme: string): string {
  return modelQuestion(theme, "pt");
}
