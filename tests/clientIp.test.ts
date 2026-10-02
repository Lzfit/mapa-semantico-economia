import { describe, expect, it } from "vitest";
import { resolveClientIp } from "@/lib/clientIp";

const h = (init: Record<string, string>) => new Headers(init);

describe("resolveClientIp", () => {
  it("na Vercel usa o IP da plataforma e ignora x-forwarded-for forjável", () => {
    const vercel = { VERCEL: "1" };
    expect(
      resolveClientIp(h({ "x-vercel-forwarded-for": "1.1.1.1", "x-forwarded-for": "6.6.6.6" }), vercel),
    ).toBe("1.1.1.1");
    expect(resolveClientIp(h({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "6.6.6.6" }), vercel)).toBe("2.2.2.2");
    expect(resolveClientIp(h({ "x-forwarded-for": "6.6.6.6" }), vercel)).toBe("unknown");
  });

  it("fora da Vercel (dev/local) aceita x-real-ip e depois o primeiro x-forwarded-for", () => {
    expect(resolveClientIp(h({ "x-real-ip": "3.3.3.3" }), {})).toBe("3.3.3.3");
    expect(resolveClientIp(h({ "x-forwarded-for": "4.4.4.4, 5.5.5.5" }), {})).toBe("4.4.4.4");
    expect(resolveClientIp(h({}), {})).toBe("unknown");
  });
});
