import { describe, expect, it } from "vitest";
import { isOwnWritingImageKey, normalizeWritingImageMime, writingImageExpiry, writingImageKey } from "./writing-image-rules";

const learner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const file = "33333333-3333-4333-8333-333333333333";

describe("writing image rules", () => {
  it("accepts only the image types the browser produces", () => {
    expect(normalizeWritingImageMime("image/JPEG")).toBe("image/jpeg");
    expect(normalizeWritingImageMime("image/webp")).toBe("image/webp");
    expect(normalizeWritingImageMime("image/heic")).toBeNull();
    expect(normalizeWritingImageMime("text/html")).toBeNull();
    expect(normalizeWritingImageMime(undefined)).toBeNull();
  });

  it("builds keys that only their owner can claim", () => {
    const key = writingImageKey(learner, file, "image/jpeg");
    expect(key).toBe(`writing-images/${learner}/${file}.jpg`);
    expect(isOwnWritingImageKey(key, learner)).toBe(true);
    expect(isOwnWritingImageKey(key, other)).toBe(false);
    expect(isOwnWritingImageKey(`recordings/${learner}/${file}.webm`, learner)).toBe(false);
    expect(isOwnWritingImageKey(`writing-images/${learner}/../${file}.jpg`, learner)).toBe(false);
  });

  it("expires three days after upload", () => {
    const from = new Date("2026-11-13T08:00:00Z");
    expect(writingImageExpiry(from).toISOString()).toBe("2026-11-16T08:00:00.000Z");
  });
});
