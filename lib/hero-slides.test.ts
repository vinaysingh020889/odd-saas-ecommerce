import { describe, expect, it } from "vitest";
import { fallbackHeroSlide, heroSlideBannerTypes } from "@/lib/hero-slides";

describe("hero slide modes", () => {
  it("supports template and image-only banner contracts", () => {
    expect(heroSlideBannerTypes).toEqual(["TEMPLATE", "IMAGE_ONLY"]);
    expect(fallbackHeroSlide()).toMatchObject({ bannerType: "TEMPLATE", primaryCtaLabel: "Shop Now", resolvedHref: "/shop" });
  });
});
