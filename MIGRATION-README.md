# Artist Migration Guide

This guide will help you add an `artist` column to your Supabase `articles` table and populate it with data from the existing `idol_name` field in Prismic.

## Overview

The migration will:
1. Add a new `artist` column (JSONB type) to the `articles` table
2. Extract artist names from the `idol_name` field in Prismic
3. Convert the artist names into an array format
4. Update all existing articles in Supabase with the artist data

## Step 1: Add the Database Column

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the following SQL script:

```sql
-- Migration script to add artist column to articles table
-- Run this in your Supabase SQL editor

-- Step 1: Add the artist column as JSONB to store arrays of artists
ALTER TABLE articles ADD COLUMN IF NOT EXISTS artist JSONB DEFAULT NULL;

-- Step 2: Create an index on the artist column for better query performance
CREATE INDEX IF NOT EXISTS idx_articles_artist ON articles USING GIN (artist);

-- Step 3: Add a comment to document the column
COMMENT ON COLUMN articles.artist IS 'Array of artist names extracted from idol_name field in Prismic';

-- Step 4: Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'articles' AND column_name = 'artist';
```

4. Click "Run" to execute the script

### Option B: Using the Migration API

If you prefer to use the API approach, you can run the migration through the API endpoint.

## Step 2: Run the Data Migration

### Option A: Using the Migration Script

1. Make sure your Next.js development server is running:
   ```bash
   npm run dev
   ```

2. In a new terminal, run the migration script:
   ```bash
   node run-migration.js
   ```

### Option B: Using the API Directly

You can also call the migration API directly:

```bash
curl -X POST http://localhost:3000/api/articles/migrate-artists
```

### Option C: Using the Browser

1. Open your browser and navigate to: `http://localhost:3000/api/articles/migrate-artists`
2. Use a tool like Postman or Insomnia to send a POST request to this endpoint

## Step 3: Verify the Migration

After running the migration, you can verify the results by:

1. Checking the console output for the migration summary
2. Querying your Supabase database to see the updated articles:

```sql
-- Check articles with artist data
SELECT slug, artist FROM articles WHERE artist IS NOT NULL;

-- Check articles without artist data
SELECT slug, artist FROM articles WHERE artist IS NULL;

-- Count total articles with artist data
SELECT COUNT(*) FROM articles WHERE artist IS NOT NULL;
```

## Data Format

The `artist` column will store JSON arrays of artist names. Examples:

- Single artist: `["BABYMETAL"]`
- Multiple artists: `["BABYMETAL", "METAL GALAXY"]`
- Artists with separators: `["Artist1", "Artist2"]` (from "Artist1, Artist2")

## Troubleshooting

### Common Issues

1. **Column already exists**: The migration will skip articles that already have artist data
2. **Article not found in Prismic**: Articles that don't exist in Prismic will be skipped
3. **No idol_name data**: Articles without idol_name will be set to `null`

### Error Handling

The migration is designed to be safe and can be run multiple times:
- It won't overwrite existing artist data
- It handles missing data gracefully
- It provides detailed logging of all operations

### Manual Updates

If you need to manually update specific articles, you can use the Supabase dashboard:

```sql
-- Update a specific article
UPDATE articles 
SET artist = ['Artist1', 'Artist2'] 
WHERE slug = 'your-article-slug';

-- Clear artist data for an article
UPDATE articles 
SET artist = NULL 
WHERE slug = 'your-article-slug';
```

## Next Steps

After the migration is complete:

1. Update your application code to use the new `artist` field
2. Consider adding artist-based filtering and search functionality
3. Update any analytics or reporting that might benefit from the structured artist data

## Support

If you encounter any issues during the migration:

1. Check the console output for detailed error messages
2. Verify your Supabase and Prismic credentials are correct
3. Ensure your Next.js development server is running
4. Check that the `articles` table exists in your Supabase database
