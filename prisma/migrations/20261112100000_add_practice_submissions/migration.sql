-- CreateTable
CREATE TABLE "practice_submissions" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "lesson_id" UUID,
    "response" JSONB NOT NULL DEFAULT '{}',
    "score" DECIMAL(7,2),
    "max_points" INTEGER NOT NULL,
    "parts" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "practice_submissions_course_id_created_at_idx" ON "practice_submissions"("course_id", "created_at");

-- CreateIndex
CREATE INDEX "practice_submissions_customer_id_created_at_idx" ON "practice_submissions"("customer_id", "created_at");

-- AddForeignKey
ALTER TABLE "practice_submissions" ADD CONSTRAINT "practice_submissions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_submissions" ADD CONSTRAINT "practice_submissions_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_submissions" ADD CONSTRAINT "practice_submissions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_submissions" ADD CONSTRAINT "practice_submissions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

