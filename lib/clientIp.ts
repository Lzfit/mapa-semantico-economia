type IpEnv = Record<string, string | undefined>;

const first = (value: string | null) => value?.split(",")[0]?.trim() || null;

/**
 * IP do cliente para rate limiting. Na Vercel só vale o que a plataforma define
 * (`x-vercel-forwarded-for`, depois `x-real-ip`); `x-forwarded-for` nunca é
 * usado ali, para não confiar em cabeçalho que o cliente possa forjar. Sem IP
 * confiável, todos caem num bucket compartilhado (mais restritivo, nunca mais
 * permissivo). Fora da Vercel (dev/local) qualquer cabeçalho serve.
 */
export function resolveClientIp(headers: Headers, env: IpEnv = process.env): string {
  if (env.VERCEL) {
    return first(headers.get("x-vercel-forwarded-for")) ?? first(headers.get("x-real-ip")) ?? "unknown";
  }
  return (
    first(headers.get("x-real-ip")) ?? first(headers.get("x-forwarded-for")) ?? "unknown"
  );
}
