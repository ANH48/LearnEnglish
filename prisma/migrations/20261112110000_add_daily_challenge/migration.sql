-- CreateTable
CREATE TABLE "course_streaks" (
    "customer_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "best" INTEGER NOT NULL DEFAULT 0,
    "to_restore" INTEGER NOT NULL DEFAULT 0,
    "last_day" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_streaks_pkey" PRIMARY KEY ("customer_id","course_id")
);

-- CreateTable
CREATE TABLE "challenge_sessions" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "max_points" INTEGER NOT NULL,
    "responses" JSONB,
    "results" JSONB,
    "score" DECIMAL(7,2),
    "outcome" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "challenge_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "challenge_sessions_customer_id_course_id_created_at_idx" ON "challenge_sessions"("customer_id", "course_id", "created_at");

-- AddForeignKey
ALTER TABLE "course_streaks" ADD CONSTRAINT "course_streaks_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_streaks" ADD CONSTRAINT "course_streaks_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_sessions" ADD CONSTRAINT "challenge_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_sessions" ADD CONSTRAINT "challenge_sessions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

