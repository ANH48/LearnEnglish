// Imports one day lesson (content JSON + generated audio) as a lesson with blocks: the text and
// exercises go into the database, the audio into file storage. Afterwards the JSON and the mp3
// files are no longer needed and do not belong in the repo.
// Safe to run again: the lesson (found by its title), its two exercises and the audio files are
// updated in place, so learners' answers stay attached. The JSON is the source of the text and
// answers; whether the lesson and exercises are published is set only when they are first created.
// Generate the audio first: node bridge/tts/generate-day-lesson-audio.mjs <json>
// Run from the repo root: npx tsx --env-file=.env scripts/import-day-lesson.ts <path to day-XX.json> [audio folder]
// The audio folder defaults to where the generator writes: <system temp>/learnenglish-tts/day-XX.
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { buildExerciseContent } from "../features/exercises/exercise-content";
import { type LessonBlock, lessonBlocksSchema, parseLessonBlocks } from "../features/lesson-blocks/lesson-blocks";

type DayLesson = {
  course: { slug: string; title: string; description: string };
  title: string;
  sentences: { title: string; items: { en: string; vi: string }[] };
  structures: { title: string; items: { pattern: string; meaning: string; examples: string }[]; text: string };
  fillBlank: { title: string; prompt: string; points: number; text: string; answers: string[][] };
  story: { label: string; title: string; paragraphs: string[] };
  vocabulary: { title: string; quizPrompt: string; items: { en: string; vi: string; accept: string[] }[] };
  translation: { title: string; paragraphs: string[] };
};

const db = new PrismaClient();

function storageClient() {
  const { S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET } = process.env;
  if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_BUCKET) throw new Error("Set the S3_* variables in .env first.");
  const client = new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION || "auto",
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
    forcePathStyle: true,
  });
  return { client, bucket: S3_BUCKET };
}

async function main() {
  const lessonPath = process.argv[2];
  if (!lessonPath) throw new Error("Usage: npx tsx --env-file=.env scripts/import-day-lesson.ts <path to day-XX.json> [audio folder]");
  const day = JSON.parse(readFileSync(lessonPath, "utf8")) as DayLesson;
  const audioDir = process.argv[3] ?? join(tmpdir(), "learnenglish-tts", basename(lessonPath, ".json"));
  const manifestPath = join(audioDir, "manifest.json");
  const manifest = existsSync(manifestPath) ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { sentenceSegments: [number, number][] }) : null;

  const admin = await db.staff.findFirstOrThrow({ where: { isSuperadmin: true, deletedAt: null } });
  const course =
    (await db.course.findUnique({ where: { slug: day.course.slug } })) ??
    (await db.course.create({ data: { ...day.course, status: "published", createdBy: admin.id } }));
  if (course.deletedAt) throw new Error(`Course ${course.slug} was deleted; restore it or change the slug.`);

  const last = await db.lesson.aggregate({ where: { courseId: course.id, deletedAt: null }, _max: { position: true } });
  const lesson =
    (await db.lesson.findFirst({ where: { courseId: course.id, title: day.title, deletedAt: null } })) ??
    (await db.lesson.create({ data: { courseId: course.id, title: day.title, status: "published", position: (last._max.position ?? -1) + 1 } }));
  if (manifest && manifest.sentenceSegments.length !== day.sentences.items.length) {
    throw new Error("The audio does not match the sentences any more; generate the audio again.");
  }
  // Exercises imported earlier are found through the blocks, so editing a prompt does not add a copy.
  const previous = parseLessonBlocks(lesson.blocks);
  const previousFillBlankId = previous.flatMap((b) => (b.type === "exercise" ? [b.exerciseId] : []))[0];
  const previousQuizId = previous.flatMap((b) => (b.type === "vocabulary" && b.quizExerciseId ? [b.quizExerciseId] : []))[0];
  // Exercises added later under the story (scripts/add-story-cloze-exercises.ts) are kept in place.
  const storyExercises = previous.filter((b) => b.type === "exercise" && b.exerciseId !== previousFillBlankId);

  // Audio: a fixed key per file, so generating again replaces the old file.
  const { client, bucket } = storageClient();
  async function uploadAudio(name: string): Promise<string | undefined> {
    const file = join(audioDir, `${name}.mp3`);
    if (!existsSync(file)) {
      console.warn(`No ${name}.mp3, that player is left out.`);
      return undefined;
    }
    const body = readFileSync(file);
    const storageKey = `lesson-audio/${lesson.id}/${name}.mp3`;
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: storageKey, Body: body, ContentType: "audio/mpeg" }));
    const media = await db.mediaFile.upsert({
      where: { storageKey },
      update: { sizeBytes: body.length, mime: "audio/mpeg" },
      create: { kind: "audio", storageKey, mime: "audio/mpeg", sizeBytes: body.length },
    });
    return media.id;
  }

  async function saveExercise(previousId: string | undefined, prompt: string, points: number, position: number, payload: unknown): Promise<string> {
    const content = buildExerciseContent("fill_blank", payload);
    if (!content.ok) throw new Error(`${prompt}: ${content.error}`);
    const data = { type: "fill_blank" as const, prompt, points, position, data: content.data as object, answerKey: content.answerKey as object };
    const existing = previousId ? await db.exercise.findFirst({ where: { id: previousId, lessonId: lesson.id, deletedAt: null } }) : null;
    if (existing) return (await db.exercise.update({ where: { id: existing.id }, data })).id;
    return (await db.exercise.create({ data: { ...data, status: "published", courseId: course.id, lessonId: lesson.id } })).id;
  }

  const fillBlankId = await saveExercise(previousFillBlankId, day.fillBlank.prompt, day.fillBlank.points, 0, {
    text: day.fillBlank.text,
    answers: day.fillBlank.answers,
  });
  const quizId = await saveExercise(previousQuizId, day.vocabulary.quizPrompt, day.vocabulary.items.length, 1, {
    text: day.vocabulary.items.map((item) => `${item.en}: ___`).join("\n"),
    answers: day.vocabulary.items.map((item) => item.accept),
  });

  const sentencesAudio = await uploadAudio("sentences");
  const blocks: LessonBlock[] = lessonBlocksSchema.parse([
    {
      type: "sentences",
      title: day.sentences.title,
      items: day.sentences.items,
      audioId: sentencesAudio,
      segments: sentencesAudio ? manifest?.sentenceSegments : undefined,
    },
    { type: "notes", ...day.structures },
    { type: "exercise", title: day.fillBlank.title, exerciseId: fillBlankId },
    {
      type: "story",
      ...day.story,
      audio: { slow: await uploadAudio("story-slow"), normal: await uploadAudio("story-normal"), fast: await uploadAudio("story-fast") },
    },
    ...storyExercises,
    {
      type: "vocabulary",
      title: day.vocabulary.title,
      items: day.vocabulary.items.map(({ en, vi }) => ({ en, vi })),
      quizExerciseId: quizId,
    },
    { type: "translation", ...day.translation },
  ]);

  await db.lesson.update({ where: { id: lesson.id }, data: { blocks } });
  console.log(`Imported "${day.title}" into course "${course.title}" (${course.status}).`);
  console.log(`Learner page: /learn/${course.slug}/${lesson.id}`);
  console.log(`Admin page:   /admin/courses/${course.id}/lessons/${lesson.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
