import { z } from "zod";

/**
 * A lesson can be built from ordered blocks, stored as JSON in `lessons.blocks`.
 * English text may mark bold with **double asterisks**; nothing else is formatted.
 * Audio fields hold `media_files` ids, played through /api/lesson-audio.
 * No "server-only" here: the import script in scripts/ uses this schema too.
 */

const line = z.string().trim().min(1).max(600);
const title = z.string().trim().max(200).default("");
const mediaId = z.uuid();

const sentencesBlock = z.object({
  type: z.literal("sentences"),
  title,
  items: z.array(z.object({ en: line, vi: z.string().trim().max(600).default("") })).min(1).max(60),
  /** One recording of every sentence in order. */
  audioId: mediaId.optional(),
  /** Start and end second of each sentence inside that recording, same order as `items`. */
  segments: z.array(z.tuple([z.number().nonnegative(), z.number().nonnegative()])).max(60).optional(),
});

const notesBlock = z.object({
  type: z.literal("notes"),
  title,
  items: z.array(z.object({ pattern: line, meaning: line, examples: z.string().trim().max(600).default("") })).max(30),
  text: z.string().trim().max(3000).default(""),
});

/** Places one of the lesson's own exercises between other blocks. */
const exerciseBlock = z.object({ type: z.literal("exercise"), title, exerciseId: z.uuid() });

const storyBlock = z.object({
  type: z.literal("story"),
  label: title,
  title,
  paragraphs: z.array(line).min(1).max(80),
  audio: z.object({ slow: mediaId.optional(), normal: mediaId.optional(), fast: mediaId.optional() }).default({}),
});

const vocabularyBlock = z.object({
  type: z.literal("vocabulary"),
  title,
  items: z.array(z.object({ en: line, vi: line })).min(1).max(60),
  /** Shown after the learner says they are ready: an exercise asking for the meanings. */
  quizExerciseId: z.uuid().optional(),
});

const translationBlock = z.object({ type: z.literal("translation"), title, paragraphs: z.array(line).min(1).max(80) });

export const lessonBlockSchema = z.discriminatedUnion("type", [
  sentencesBlock,
  notesBlock,
  exerciseBlock,
  storyBlock,
  vocabularyBlock,
  translationBlock,
]);
export const lessonBlocksSchema = z.array(lessonBlockSchema).max(40);

export type LessonBlock = z.infer<typeof lessonBlockSchema>;
export type SentencesBlock = z.infer<typeof sentencesBlock>;
export type StoryBlock = z.infer<typeof storyBlock>;
export type VocabularyBlock = z.infer<typeof vocabularyBlock>;

export const STORY_SPEEDS = ["slow", "normal", "fast"] as const;
export type StorySpeed = (typeof STORY_SPEEDS)[number];

/** Stored blocks, or an empty list when the column holds something unexpected (never throws). */
export function parseLessonBlocks(value: unknown): LessonBlock[] {
  const parsed = lessonBlocksSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

/** Every audio file the blocks refer to; the audio route serves only these. */
export function blockAudioIds(blocks: LessonBlock[]): string[] {
  return blocks.flatMap((block) => {
    if (block.type === "sentences") return block.audioId ? [block.audioId] : [];
    if (block.type === "story") return STORY_SPEEDS.flatMap((speed) => block.audio[speed] ?? []);
    return [];
  });
}

const SPEED_NAMES: Record<StorySpeed, string> = { slow: "Chậm", normal: "Bình thường", fast: "Nhanh" };

/** Every audio file with a name a teacher recognises, in lesson order; for the admin audio list. */
export function blockAudioEntries(blocks: LessonBlock[]): { mediaId: string; label: string }[] {
  return blocks.flatMap((block) => {
    if (block.type === "sentences") return block.audioId ? [{ mediaId: block.audioId, label: block.title || "Các câu" }] : [];
    if (block.type === "story") {
      return STORY_SPEEDS.flatMap((speed) => {
        const mediaId = block.audio[speed];
        return mediaId ? [{ mediaId, label: `Truyện: ${block.title} · ${SPEED_NAMES[speed]}` }] : [];
      });
    }
    return [];
  });
}

/** Exercises a block shows in place, so the lesson page does not list them a second time. */
export function blockExerciseIds(blocks: LessonBlock[]): string[] {
  return blocks.flatMap((block) => {
    if (block.type === "exercise") return [block.exerciseId];
    if (block.type === "vocabulary") return block.quizExerciseId ? [block.quizExerciseId] : [];
    return [];
  });
}

/** Splits "a **b** c" into plain and bold pieces, for rendering and for text-to-speech. */
export function splitBold(text: string): { text: string; bold: boolean }[] {
  return text
    .split("**")
    .map((piece, index) => ({ text: piece, bold: index % 2 === 1 }))
    .filter((piece) => piece.text !== "");
}

export const lessonAudioUrl = (lessonId: string, mediaFileId: string) => `/api/lesson-audio/${lessonId}/${mediaFileId}`;
