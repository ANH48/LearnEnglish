import { describe, expect, it } from "vitest";
import { isOwnRecordingKey, normalizeRecordingMime, recordingKey } from "./recording-rules";

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const FILE = "33333333-3333-4333-8333-333333333333";

describe("recording rules", () => {
  it("strips codec details from what the browser reports", () => {
    expect(normalizeRecordingMime("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(normalizeRecordingMime("Audio/MP4")).toBe("audio/mp4");
  });
  it("refuses types that are not voice recordings", () => {
    expect(normalizeRecordingMime("video/webm")).toBeNull();
    expect(normalizeRecordingMime("text/html")).toBeNull();
    expect(normalizeRecordingMime(undefined)).toBeNull();
    expect(normalizeRecordingMime("constructor")).toBeNull();
  });
  it("builds a key the same learner is recognised as owning", () => {
    const key = recordingKey(ME, FILE, "audio/mp4");
    expect(key).toBe(`recordings/${ME}/${FILE}.m4a`);
    expect(isOwnRecordingKey(key, ME)).toBe(true);
  });
  it("does not let a learner claim another learner's file or a path outside recordings", () => {
    expect(isOwnRecordingKey(recordingKey(OTHER, FILE, "audio/webm"), ME)).toBe(false);
    expect(isOwnRecordingKey(`recordings/${ME}/../${OTHER}/${FILE}.webm`, ME)).toBe(false);
    expect(isOwnRecordingKey(`pdf/${ME}/${FILE}.webm`, ME)).toBe(false);
    expect(isOwnRecordingKey({ startsWith: "recordings/" }, ME)).toBe(false);
  });
});
