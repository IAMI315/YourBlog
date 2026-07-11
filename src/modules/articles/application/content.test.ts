import { describe, expect, it } from "vitest";

import { hasImagesMissingAltText } from "./content";

describe("article content media requirements", () => {
  it("detects TipTap image nodes without alternative text", () => {
    expect(
      hasImagesMissingAltText({
        type: "doc",
        content: [{ type: "image", attrs: { src: "/media/media/2026/07/id/original.png" } }],
      }),
    ).toBe(true);
  });

  it("accepts TipTap image nodes with trimmed alternative text", () => {
    expect(
      hasImagesMissingAltText({
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: "/media/media/2026/07/id/original.png", alt: "部署结构图" },
          },
        ],
      }),
    ).toBe(false);
  });
});
