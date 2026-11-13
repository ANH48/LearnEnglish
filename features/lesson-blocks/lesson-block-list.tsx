import type { ReactNode } from "react";
import { ExerciseLauncher } from "@/features/lesson-exercises/lesson-exercise-dialog";
import { BoldText } from "./bold-text";
import { type LessonBlock, STORY_SPEEDS, type StorySpeed, lessonAudioUrl } from "./lesson-blocks";
import { SentenceListBlock } from "./sentence-list-block";
import { StoryBlock } from "./story-block";
import { VocabularyBlock } from "./vocabulary-block";

type Props = {
  lessonId: string;
  blocks: LessonBlock[];
  /** Ids of the lesson's published exercises; they open in the exercise popup. */
  exerciseIds: Set<string>;
};

function Section({ label, title, children }: { label?: string; title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t pt-6">
      <div>
        {label && <p className="text-xs font-semibold tracking-wide text-accent-foreground uppercase">{label}</p>}
        {title && <h2 className="text-xl font-semibold text-balance">{title}</h2>}
      </div>
      {children}
    </section>
  );
}

/** Reading text keeps a comfortable line length; lists use the full width as columns. */
const READING_WIDTH = "max-w-2xl";

/** Renders a lesson's blocks in order. An exercise that is missing or unpublished is skipped silently. */
export function LessonBlockList({ lessonId, blocks, exerciseIds }: Props) {
  // A translation is shown beside the story it follows; without a story before it, it stays a section of its own.
  const translationOfStory = new Map<number, string[]>();
  const pairedTranslations = new Set<number>();
  let openStory: number | null = null;
  blocks.forEach((block, index) => {
    if (block.type === "story") openStory = index;
    if (block.type === "translation" && openStory !== null) {
      translationOfStory.set(openStory, block.paragraphs);
      pairedTranslations.add(index);
      openStory = null;
    }
  });

  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "sentences":
            return (
              <Section key={index} title={block.title}>
                <SentenceListBlock block={block} audioSrc={block.audioId ? lessonAudioUrl(lessonId, block.audioId) : null} />
              </Section>
            );
          case "notes":
            return (
              <Section key={index} title={block.title}>
                <dl className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
                  {block.items.map((item) => (
                    <div key={item.pattern} className="rounded-xl border bg-card px-3 py-2">
                      <dt className="inline font-bold" lang="en">
                        {item.pattern}
                      </dt>
                      <dd className="inline">
                        {" "}
                        {item.meaning}
                        {item.examples && <span className="text-muted-foreground"> · {item.examples}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
                {block.text && (
                  <p className={`text-sm leading-6 text-muted-foreground ${READING_WIDTH}`}>
                    <BoldText text={block.text} />
                  </p>
                )}
              </Section>
            );
          case "exercise":
            return exerciseIds.has(block.exerciseId) ? (
              <Section key={index} title={block.title}>
                <div className={READING_WIDTH}>
                  <ExerciseLauncher exerciseId={block.exerciseId} />
                </div>
              </Section>
            ) : null;
          case "story": {
            const audioSrc: Partial<Record<StorySpeed, string>> = {};
            for (const speed of STORY_SPEEDS) {
              const id = block.audio[speed];
              if (id) audioSrc[speed] = lessonAudioUrl(lessonId, id);
            }
            return (
              <Section key={index} label={block.label} title={block.title}>
                <StoryBlock block={block} audioSrc={audioSrc} translation={translationOfStory.get(index) ?? null} />
              </Section>
            );
          }
          case "vocabulary":
            return (
              <Section key={index} title={block.title}>
                <VocabularyBlock block={block} quizExerciseId={block.quizExerciseId && exerciseIds.has(block.quizExerciseId) ? block.quizExerciseId : null} />
              </Section>
            );
          case "translation":
            return pairedTranslations.has(index) ? null : (
              <Section key={index} title={block.title}>
                <div className={`grid gap-2 leading-7 text-muted-foreground ${READING_WIDTH}`}>
                  {block.paragraphs.map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </Section>
            );
        }
      })}
    </>
  );
}
