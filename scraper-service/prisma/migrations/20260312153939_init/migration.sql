-- CreateEnum
CREATE TYPE "dictionary_type" AS ENUM ('ofertowy', 'popularnonaukowy');

-- CreateEnum
CREATE TYPE "longtail_source" AS ENUM ('openai', 'trends', 'manual', 'import');

-- CreateEnum
CREATE TYPE "trend_query_group" AS ENUM ('top', 'rising', 'unknown');

-- CreateEnum
CREATE TYPE "trend_alert_status" AS ENUM ('open', 'seen', 'dismissed');

-- CreateEnum
CREATE TYPE "article_status" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "dictionary_words" (
    "id" BIGSERIAL NOT NULL,
    "type" "dictionary_type" NOT NULL,
    "word" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dictionary_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "longtail_phrases" (
    "id" BIGSERIAL NOT NULL,
    "dictionary_word_id" BIGINT NOT NULL,
    "phrase" TEXT NOT NULL,
    "phrase_norm" TEXT NOT NULL,
    "geo" TEXT NOT NULL DEFAULT 'PL',
    "language" TEXT NOT NULL DEFAULT 'pl',
    "source" "longtail_source" NOT NULL DEFAULT 'manual',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "alert_threshold_pct" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "longtail_phrases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phrase_trends" (
    "id" BIGSERIAL NOT NULL,
    "longtail_phrase_id" BIGINT NOT NULL,
    "snapshot_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "geo" TEXT NOT NULL DEFAULT 'PL',
    "timeframe_label" TEXT NOT NULL,
    "timeframe_param" TEXT NOT NULL,
    "window_days" INTEGER NOT NULL DEFAULT 30,
    "extracted_at" TIMESTAMP(3) NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "mean" DOUBLE PRECISION,
    "slope" DOUBLE PRECISION,
    "change_pct" DOUBLE PRECISION,
    "score" DOUBLE PRECISION,
    "raw_series" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phrase_trends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_related_queries" (
    "id" BIGSERIAL NOT NULL,
    "phrase_trend_id" BIGINT NOT NULL,
    "group_type" "trend_query_group" NOT NULL DEFAULT 'unknown',
    "rank" INTEGER NOT NULL,
    "query" TEXT NOT NULL,
    "search_interest" INTEGER,
    "increase_pct" DOUBLE PRECISION,
    "is_breakout" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_related_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_alerts" (
    "id" BIGSERIAL NOT NULL,
    "longtail_phrase_id" BIGINT NOT NULL,
    "phrase_trend_id" BIGINT,
    "threshold" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "change_pct" DOUBLE PRECISION NOT NULL,
    "status" "trend_alert_status" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alert_day" DATE NOT NULL DEFAULT CURRENT_DATE,
    "seen_at" TIMESTAMP(3),

    CONSTRAINT "trend_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" BIGSERIAL NOT NULL,
    "longtail_phrase_id" BIGINT,
    "dictionary_word_id" BIGINT,
    "title" TEXT NOT NULL,
    "title_norm" TEXT NOT NULL,
    "status" "article_status" NOT NULL DEFAULT 'draft',
    "content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_dictionary_words_type" ON "dictionary_words"("type");

-- CreateIndex
CREATE UNIQUE INDEX "dictionary_words_type_word_key" ON "dictionary_words"("type", "word");

-- CreateIndex
CREATE INDEX "idx_longtail_active" ON "longtail_phrases"("active");

-- CreateIndex
CREATE INDEX "idx_longtail_dictionary" ON "longtail_phrases"("dictionary_word_id");

-- CreateIndex
CREATE INDEX "idx_longtail_geo" ON "longtail_phrases"("geo");

-- CreateIndex
CREATE INDEX "idx_longtail_active_geo" ON "longtail_phrases"("active", "geo");

-- CreateIndex
CREATE UNIQUE INDEX "longtail_phrases_dictionary_word_id_phrase_norm_key" ON "longtail_phrases"("dictionary_word_id", "phrase_norm");

-- CreateIndex
CREATE INDEX "idx_phrase_trends_date" ON "phrase_trends"("snapshot_date" DESC);

-- CreateIndex
CREATE INDEX "idx_phrase_trends_phrase_date" ON "phrase_trends"("longtail_phrase_id", "snapshot_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "phrase_trends_longtail_phrase_id_snapshot_date_geo_timefram_key" ON "phrase_trends"("longtail_phrase_id", "snapshot_date", "geo", "timeframe_param");

-- CreateIndex
CREATE INDEX "idx_trend_related_queries_snapshot_group_rank" ON "trend_related_queries"("phrase_trend_id", "group_type", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "trend_related_queries_phrase_trend_id_group_type_query_key" ON "trend_related_queries"("phrase_trend_id", "group_type", "query");

-- CreateIndex
CREATE INDEX "idx_trend_alerts_status_created" ON "trend_alerts"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_trend_alerts_phrase_created" ON "trend_alerts"("longtail_phrase_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "trend_alerts_longtail_phrase_id_alert_day_key" ON "trend_alerts"("longtail_phrase_id", "alert_day");

-- CreateIndex
CREATE INDEX "idx_articles_status_created" ON "articles"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_articles_longtail" ON "articles"("longtail_phrase_id");

-- CreateIndex
CREATE UNIQUE INDEX "articles_title_norm_key" ON "articles"("title_norm");

-- AddForeignKey
ALTER TABLE "longtail_phrases" ADD CONSTRAINT "longtail_phrases_dictionary_word_id_fkey" FOREIGN KEY ("dictionary_word_id") REFERENCES "dictionary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phrase_trends" ADD CONSTRAINT "phrase_trends_longtail_phrase_id_fkey" FOREIGN KEY ("longtail_phrase_id") REFERENCES "longtail_phrases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_related_queries" ADD CONSTRAINT "trend_related_queries_phrase_trend_id_fkey" FOREIGN KEY ("phrase_trend_id") REFERENCES "phrase_trends"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_alerts" ADD CONSTRAINT "trend_alerts_longtail_phrase_id_fkey" FOREIGN KEY ("longtail_phrase_id") REFERENCES "longtail_phrases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_alerts" ADD CONSTRAINT "trend_alerts_phrase_trend_id_fkey" FOREIGN KEY ("phrase_trend_id") REFERENCES "phrase_trends"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_longtail_phrase_id_fkey" FOREIGN KEY ("longtail_phrase_id") REFERENCES "longtail_phrases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_dictionary_word_id_fkey" FOREIGN KEY ("dictionary_word_id") REFERENCES "dictionary_words"("id") ON DELETE SET NULL ON UPDATE CASCADE;
