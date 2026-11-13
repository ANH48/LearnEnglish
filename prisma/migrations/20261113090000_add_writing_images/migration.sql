-- CreateTable
CREATE TABLE "writing_images" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "attempt_id" UUID,
    "storage_key" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "writing_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "writing_images_storage_key_key" ON "writing_images"("storage_key");

-- CreateIndex
CREATE INDEX "writing_images_expires_at_idx" ON "writing_images"("expires_at");

-- CreateIndex
CREATE INDEX "writing_images_customer_id_exercise_id_idx" ON "writing_images"("customer_id", "exercise_id");

-- AddForeignKey
ALTER TABLE "writing_images" ADD CONSTRAINT "writing_images_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "writing_images" ADD CONSTRAINT "writing_images_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

