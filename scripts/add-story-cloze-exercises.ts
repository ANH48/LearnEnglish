// Adds two listening fill-in exercises under the story of every day lesson in a course:
//   1. "Nghe truyện, điền từ in đậm": the story with each bold word (a word the day teaches) blanked.
//   2. "Nâng cao: điền cụm từ": the story with chosen phrases blanked (at most MAX_PHRASE_BLANKS).
// Both are graded at once on submit. The learner plays the story audio above and fills the blanks.
// The phrases come from a JSON file: { "<day number>": ["phrase", ...] }, each phrase written exactly
// as in the story (without the ** marks). A phrase that is not found is reported and skipped.
// Safe to run again: the two exercises are found through their blocks and updated in place.
// Run from the repo root:
//   npx tsx --env-file=.env scripts/add-story-cloze-exercises.ts <phrases.json> [course slug]
// DRY_RUN=1 only prints what would be saved.
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { BLANK, buildExerciseContent } from "../features/exercises/exercise-content";
import { type LessonBlock, lessonBlocksSchema, parseLessonBlocks } from "../features/lesson-blocks/lesson-blocks";

const BOLD_TITLE = "Nghe truyện, điền từ in đậm";
const BOLD_PROMPT = "Bật audio truyện ở trên, nghe và điền những từ đã học vào chỗ trống.";
const PHRASE_TITLE = "Nâng cao: nghe và điền cụm từ";
const PHRASE_PROMPT = "Nghe lại truyện và điền đúng cả cụm từ vào mỗi chỗ trống.";
const MAX_PHRASE_BLANKS = 20;
const DRY_RUN = process.env.DRY_RUN === "1";

const db = new PrismaClient();

type Cloze = { text: string; answers: string[][] };

/** Blanks every **bold** piece of the story; the bold piece is the answer. */
function boldCloze(paragraphs: string[]): Cloze {
  const answers: string[][] = [];
  const text = paragraphs
    .join("\n")
    .replace(/\*\*(.+?)\*\*/g, (_, word: string) => {
      answers.push([word.trim()]);
      return BLANK;
    });
  return { text, answers };
}

/** Blanks the first free occurrence of each phrase, in story order; returns the phrases it could not place. */
function phraseCloze(paragraphs: string[], phrases: string[], max: number): Cloze & { missing: string[] } {
  const plain = paragraphs.join("\n").replaceAll("**", "");
  const taken: { start: number; end: number; phrase: string }[] = [];
  const missing: string[] = [];
  for (const phrase of phrases) {
    if (taken.length >= max) break;
    let from = 0;
    let placed = false;
    while (!placed) {
      const start = plain.indexOf(phrase, from);
      if (start < 0) break;
      const end = start + phrase.length;
      const wholeWords = !/\w/.test(plain[start - 1] ?? "") && !/\w/.test(plain[end] ?? "");
      if (wholeWords && taken.every((t) => end <= t.start || start >= t.end)) {
        taken.push({ start, end, phrase });
        placed = true;
      }
      from = start + 1;
    }
    if (!placed) missing.push(phrase);
  }
  taken.sort((a, b) => a.start - b.start);
  let text = "";
  let cursor = 0;
  for (const t of taken) {
    text += plain.slice(cursor, t.start) + BLANK;
    cursor = t.end;
  }
  text += plain.slice(cursor);
  return { text, answers: taken.map((t) => [t.phrase]), missing };
}

async function main() {
  const [phrasesPath, slug = "1000-cau-50-ngay"] = process.argv.slice(2);
  if (!phrasesPath) throw new Error("Usage: npx tsx --env-file=.env scripts/add-story-cloze-exercises.ts <phrases.json> [course slug]");
  const phrasesByDay = JSON.parse(readFileSync(phrasesPath, "utf8")) as Record<string, string[]>;

  const course = await db.course.findUniqueOrThrow({ where: { slug } });
  const lessons = await db.lesson.findMany({ where: { courseId: course.id, deletedAt: null }, orderBy: { position: "asc" } });

  for (const lesson of lessons) {
    const day = /Ngày (\d+)/.exec(lesson.title)?.[1];
    const blocks = parseLessonBlocks(lesson.blocks);
    const story = blocks.find((b) => b.type === "story");
    if (!day || !story) {
      console.warn(`Skipped "${lesson.title}": no day number or no story.`);
      continue;
    }
    const existingId = (title: string) => blocks.flatMap((b) => (b.type === "exercise" && b.title === title ? [b.exerciseId] : []))[0];

    async function saveExercise(title: string, prompt: string, cloze: Cloze, position: number): Promise<string> {
      const content = buildExerciseContent("fill_blank", cloze);
      if (!content.ok) throw new Error(`${lesson.title} / ${title}: ${content.error}`);
      const data = { type: "fill_blank" as const, prompt, points: cloze.answers.length, position, data: content.data as object, answerKey: content.answerKey as object };
      const previousId = existingId(title);
      const existing = previousId ? await db.exercise.findFirst({ where: { id: previousId, lessonId: lesson.id, deletedAt: null } }) : null;
      if (existing) return (await db.exercise.update({ where: { id: existing.id }, data })).id;
      return (await db.exercise.create({ data: { ...data, status: "published", courseId: course.id, lessonId: lesson.id } })).id;
    }

    const bold = boldCloze(story.paragraphs);
    const phrases = phraseCloze(story.paragraphs, phrasesByDay[day] ?? [], MAX_PHRASE_BLANKS);
    if (phrases.missing.length) console.warn(`Ngày ${day}: not found, skipped: ${phrases.missing.join(" | ")}`);
    if (phrases.answers.length < 10) throw new Error(`Ngày ${day}: only ${phrases.answers.length} phrases placed, need at least 10.`);

    if (DRY_RUN) {
      console.log(`Ngày ${day}: ${bold.answers.length} bold, ${phrases.answers.length} phrases\n${phrases.text}\n`);
      continue;
    }
    const boldId = await saveExercise(BOLD_TITLE, BOLD_PROMPT, bold, 2);
    const phraseId = await saveExercise(PHRASE_TITLE, PHRASE_PROMPT, phrases, 3);

    // The two exercises go right after the story, where its audio player is.
    const others = blocks.filter((b) => !(b.type === "exercise" && (b.title === BOLD_TITLE || b.title === PHRASE_TITLE)));
    const storyIndex = others.findIndex((b) => b.type === "story");
    const added: LessonBlock[] = [
      { type: "exercise", title: BOLD_TITLE, exerciseId: boldId },
      { type: "exercise", title: PHRASE_TITLE, exerciseId: phraseId },
    ];
    const next = lessonBlocksSchema.parse([...others.slice(0, storyIndex + 1), ...added, ...others.slice(storyIndex + 1)]);
    await db.lesson.update({ where: { id: lesson.id }, data: { blocks: next } });
    console.log(`Ngày ${day}: ${bold.answers.length} bold blanks, ${phrases.answers.length} phrase blanks.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
