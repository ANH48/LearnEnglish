import { describe, expect, it } from "vitest";
import { gradebookCell } from "./gradebook-cell";

describe("gradebookCell", () => {
  it("shows a dash when the learner never started", () => {
    expect(gradebookCell([], 10)).toBe("—");
  });
  it("says the learner is still working when nothing is handed in", () => {
    expect(gradebookCell([{ status: "in_progress", score: null }], 10)).toBe("Đang làm");
  });
  it("shows the best score of several finished attempts", () => {
    expect(gradebookCell([{ status: "graded", score: "4.5" }, { status: "graded", score: "8" }], 10)).toBe("8/10");
  });
  it("marks a score that still waits for manual grading", () => {
    expect(gradebookCell([{ status: "submitted", score: "6" }], 10)).toBe("6/10 (chờ chấm)");
  });
  it("ignores a running attempt next to a finished one", () => {
    expect(gradebookCell([{ status: "graded", score: "7" }, { status: "in_progress", score: null }], 10)).toBe("7/10");
  });
});
