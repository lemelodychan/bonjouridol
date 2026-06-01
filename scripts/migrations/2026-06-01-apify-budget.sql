-- Adds monthly Apify budget tracking to the existing curation_settings singleton.
-- Run this in the Supabase SQL Editor.

ALTER TABLE curation_settings
  ADD COLUMN IF NOT EXISTS apify_tweets_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS apify_month_start DATE NOT NULL DEFAULT date_trunc('month', current_date)::date;
