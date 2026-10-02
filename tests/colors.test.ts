import { describe, expect, it } from "vitest";
import { associationColor } from "@/lib/colors";

describe("associationColor", () => {
  it("nos pontos da escala devolve as cores da SPEC", () => {
    expect(associationColor(0)).toBe("rgb(233, 235, 230)");
    expect(associationColor(0.5)).toBe("rgb(183, 215, 189)");
    expect(associationColor(1)).toBe("rgb(47, 157, 85)");
  });

  it("interpola de forma contínua e limita fora de 0–1", () => {
    expect(associationColor(0.125)).toBe("rgb(225, 232, 224)");
    expect(associationColor(-1)).toBe(associationColor(0));
    expect(associationColor(2)).toBe("rgb(47, 157, 85)");
  });
});
