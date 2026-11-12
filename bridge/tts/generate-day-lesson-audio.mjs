// Generates the audio of one day lesson with Kokoro (local model, American English voice):
//   sentences.mp3     every sentence once, each followed by silence long enough to repeat it
//   story-slow.mp3, story-normal.mp3, story-fast.mp3
//   manifest.json     where each sentence starts and ends inside sentences.mp3
// Each speed is synthesized on its own (the model slows down or speeds up its delivery);
// a single recording is never time-stretched.
//
// Setup once:  cd bridge/tts && npm install      (also needs ffmpeg on PATH)
// Run from the repo root:
//   node bridge/tts/generate-day-lesson-audio.mjs <path to day-XX.json> [output folder]
// The files are only a step on the way to storage: by default they go to the system temp folder
// (learnenglish-tts/day-XX), where scripts/import-day-lesson.ts picks them up and uploads them.
// The first run downloads the model (about 90 MB).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { KokoroTTS } from "kokoro-js";

const VOICE = process.env.TTS_VOICE ?? "af_heart";
const STORY_SPEEDS = { slow: 0.8, normal: 1, fast: 1.2 };
const SAMPLE_RATE = 24000;

const lessonPath = process.argv[2];
if (!lessonPath) {
  console.error("Usage: node bridge/tts/generate-day-lesson-audio.mjs <path to day-XX.json> [output folder]");
  process.exit(1);
}
const lesson = JSON.parse(readFileSync(lessonPath, "utf8"));
const outDir = process.argv[3] ?? join(tmpdir(), "learnenglish-tts", basename(lessonPath, ".json"));
mkdirSync(outDir, { recursive: true });

/** Bold markers are for the page only; curly quotes read the same as straight ones. */
const spoken = (text) => text.replaceAll("**", "").replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
const silence = (seconds) => new Float32Array(Math.round(seconds * SAMPLE_RATE));

function concat(parts) {
  const all = new Float32Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    all.set(part, offset);
    offset += part.length;
  }
  return all;
}

/** Writes 16-bit mono WAV, then lets ffmpeg encode the mp3. */
function saveMp3(samples, name) {
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + samples.length * 2, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); // PCM
  wav.writeUInt16LE(1, 22); // mono
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  }
  const wavPath = join(outDir, `${name}.wav`);
  const mp3Path = join(outDir, `${name}.mp3`);
  writeFileSync(wavPath, wav);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", wavPath, "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "64k", mp3Path]);
  rmSync(wavPath);
  console.log(`${name}.mp3  ${(samples.length / SAMPLE_RATE).toFixed(1)}s`);
}

const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });

async function speak(text, speed) {
  const audio = await tts.generate(spoken(text), { voice: VOICE, speed });
  if (audio.sampling_rate !== SAMPLE_RATE) throw new Error(`Unexpected sample rate ${audio.sampling_rate}`);
  return audio.audio;
}

// Sentences: each one, then a pause as long as the sentence plus a little, for saying it back.
const sentenceParts = [silence(0.3)];
const segments = [];
let cursor = 0.3;
for (const item of lesson.sentences.items) {
  const clip = await speak(item.en, 1);
  const seconds = clip.length / SAMPLE_RATE;
  segments.push([Number(cursor.toFixed(2)), Number((cursor + seconds).toFixed(2))]);
  const gap = seconds + 0.6;
  sentenceParts.push(clip, silence(gap));
  cursor += seconds + gap;
}
saveMp3(concat(sentenceParts), "sentences");

// Story: the title, then one clip per paragraph so the model keeps natural sentence melody.
for (const [name, speed] of Object.entries(STORY_SPEEDS)) {
  const parts = [silence(0.3), await speak(`${lesson.story.title}.`, speed), silence(0.9 / speed)];
  for (const paragraph of lesson.story.paragraphs) {
    parts.push(await speak(paragraph, speed), silence(0.55 / speed));
  }
  saveMp3(concat(parts), `story-${name}`);
}

writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify({ voice: VOICE, storySpeeds: STORY_SPEEDS, sentenceSegments: segments }, null, 2)}\n`);
console.log(`Done: ${outDir}`);
