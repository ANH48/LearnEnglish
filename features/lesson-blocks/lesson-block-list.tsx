import type { ReactNode } from "react";
import { BoldText } from "./bold-text";
import { type LessonBlock, STORY_SPEEDS, type StorySpeed, lessonAudioUrl } from "./lesson-blocks";
import { SentenceListBlock } from "./sentence-list-block";
import { StoryBlock } from "./story-block";
import { VocabularyBlock } from "./vocabulary-block";

type Props = {
  lessonId: string;
  blocks: LessonBlock[];
  /** The lesson's published exercises, already rendered, by exercise id. */
  exercises: Map<string, ReactNode>;
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

/** Renders a lesson's blocks in order. An exercise that is missing or unpublished is skipped silently. */
export function LessonBlockList({ lessonId, blocks, exercises }: Props) {
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
                <dl className="grid gap-2 text-sm">
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
                  <p className="text-sm leading-6 text-muted-foreground">
                    <BoldText text={block.text} />
                  </p>
                )}
              </Section>
            );
          case "exercise": {
            const exercise = exercises.get(block.exerciseId);
            return exercise ? (
              <Section key={index} title={block.title}>
                {exercise}
              </Section>
            ) : null;
          }
          case "story": {
            const audioSrc: Partial<Record<StorySpeed, string>> = {};
            for (const speed of STORY_SPEEDS) {
              const id = block.audio[speed];
              if (id) audioSrc[speed] = lessonAudioUrl(lessonId, id);
            }
            return (
              <Section key={index} label={block.label} title={block.title}>
                <StoryBlock block={block} audioSrc={audioSrc} />
              </Section>
            );
          }
          case "vocabulary":
            return (
              <Section key={index} title={block.title}>
                <VocabularyBlock block={block} quiz={(block.quizExerciseId && exercises.get(block.quizExerciseId)) || null} />
              </Section>
            );
          case "translation":
            return (
              <Section key={index} title={block.title}>
                <div className="grid gap-2 leading-7 text-muted-foreground">
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
