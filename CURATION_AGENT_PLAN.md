# AI News Curation Agent — Implementation Plan

## What this does (plain English)

Every 3 hours, an automated job wakes up and checks a list of news sites and Twitter accounts you've configured. It reads new posts and sends them to OpenAI, which decides if they're relevant to Bonjour Idol (female Japanese idol groups, no male groups, no anime). If relevant, it translates the content from Japanese to English and formats it either as a ready-to-post tweet or as a press release article draft.

You then visit a new "Content Queue" page in the admin panel, review what the AI found, and either approve (which creates a Prismic draft for articles, or gives you copy-paste text for tweets) or reject it (with a reason). Those rejection reasons are fed back to the AI to make it smarter over time.

**Core loop:**
```
Every 3h: Fetch new content from sources
       ↓
       Deduplicate (skip anything already seen)
       ↓
       OpenAI: Is this relevant? Tweet or article? 
       ↓
       OpenAI: Translate to English, format content
       ↓
       Queue for human review
       ↓
       Human: Approve or Reject (with reason)
       ↓
       Approve article → Prismic draft created automatically
       Approve tweet   → Formatted text ready to copy-paste
       Reject          → Reason stored, AI learns from it next time
```

---

## Tech Stack

| Concern | Tool | Why |
|---|---|---|
| AI classification + translation | OpenAI `gpt-4o` | Best available model, personal account is fine at this volume |
| Crawler scheduling | GitHub Actions | Free on public repos, reliable, easy to trigger manually |
| Twitter scraping | Nitter RSS | Nitter is an open-source Twitter frontend that exposes RSS feeds for any account — free, no API needed |
| News site scraping | RSS feed parser + Cheerio | RSS is the simplest and most reliable way to read sites; Cheerio is a lightweight HTML scraper for sites without RSS |
| Queue + settings storage | Supabase (already in use) | Same database used for galleries, consistent pattern |
| Article draft creation | Prismic Migration API (already in use) | Same mechanism used for gallery drafts |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  GitHub Actions — runs every 3 hours             │
│                                                  │
│  Step 1: POST /api/admin/curation/crawl/fetch    │
│    → Reads all active sources (RSS + Nitter)     │
│    → Skips items already seen (dedup check)      │
│    → Saves new raw items to Supabase             │
│    → Returns in ~5 seconds ✓                     │
│                                                  │
│  Step 2: POST /api/admin/curation/crawl/process  │
│    → Picks up unprocessed items (max 10/run)     │
│    → Sends each to OpenAI for relevance check    │
│    → Translates + formats relevant items         │
│    → Moves them to the review queue              │
│    → Returns in ~20 seconds ✓                    │
└─────────────────────────────────────────────────┘
                        ↓
            Supabase: content_queue table
                        ↓
         Admin panel: /admin/curation/queue
                        ↓
        ┌───────────────┴───────────────┐
        │                               │
    Approve tweet                  Approve article
    → copy-paste text              → Prismic draft created
    → status: approved             → status: approved
        │                               │
        └───────────────┬───────────────┘
                        ↓
                   Reject item
                   → reason form
                   → stored in ai_feedback
                   → injected into next AI prompt
```

**Why two steps instead of one?**
The API has a 30 second timeout (`vercel.json`). Fetching 50+ RSS feeds AND running OpenAI on new items in one go risks hitting that limit. Splitting into fetch (fast HTTP requests) and process (OpenAI calls, capped at 10 items) keeps each step well within 30 seconds.

---

## Supabase Schema

Four new tables. All follow the same pattern as the existing `pending_gallery_migrations` table.

### `content_sources`
The list of news sites and Twitter accounts to monitor. Managed from the admin UI.

```sql
create table content_sources (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('rss', 'html', 'twitter')),
  -- 'rss'     → url is a full RSS feed URL (e.g. https://prtimes.jp/rss3.0.xml)
  -- 'html'    → url is a page URL; Cheerio scrapes it
  -- 'twitter' → url is just the handle, e.g. "idol_group_official"
  --             (no @ symbol, no domain)
  --             crawler builds: {NITTER_INSTANCE}/{handle}/rss
  label           text not null,
  url             text not null,
  active          boolean not null default true,
  crawl_config    jsonb,
  -- only used for 'html' type sources:
  -- { "titleSelector": "h1.article-title", "bodySelector": "div.article-body" }
  last_crawled_at timestamptz,
  last_error      text,
  -- if the last fetch failed, the error message is stored here
  -- shown as a warning in the Source Manager UI
  created_at      timestamptz default now()
);
```

### `content_queue`
Every item the AI decides is worth reviewing. The main table for the queue UI.

```sql
create table content_queue (
  id                  uuid primary key default gen_random_uuid(),
  source_id           uuid references content_sources(id),
  type                text not null check (type in ('tweet', 'article')),
  status              text not null default 'raw'
    check (status in (
      'raw',       -- fetched, not yet processed by AI
      'pending',   -- AI processed, waiting for human review
      'approved',  -- human approved
      'rejected',  -- human rejected
      'published'  -- manually marked as published after posting
    )),

  raw_content jsonb not null,
  -- what was scraped, before any AI processing:
  -- {
  --   "title":              string | null,
  --   "body":               string,
  --   "author":             string | null,
  --   "source_url":         string,       ← link back to original article/tweet
  --   "image_urls":         string[],     ← images found in the content
  --   "published_at":       string | null,
  --   "original_tweet_url": string | null ← for Twitter sources
  -- }

  translated_content jsonb,
  -- populated by the AI process step.
  -- for type = 'tweet':
  -- {
  --   "tweet_body":         string,       ← fully formatted tweet, ready to copy
  --   "ja_original":        string,       ← original Japanese text
  --   "group_handle":       string,       ← e.g. "@CUTIE_STREET_"
  --   "suggested_hashtags": string[]
  -- }
  -- for type = 'article':
  -- {
  --   "title":              string,
  --   "subtitle":           string | null,
  --   "idol_name":          string,
  --   "en_body":            string,       ← full English translation
  --   "ja_original":        string,
  --   "group_handle":       string,
  --   "suggested_hashtags": string[]
  -- }

  ai_reasoning        text,
  -- plain English explanation of why the AI included this item
  -- e.g. "Press release from a known idol agency about a female group in the directory"
  -- shown collapsed in the UI, useful for understanding AI decisions

  ai_confidence       float,
  -- relevance score between 0 and 1 (e.g. 0.87 = 87% confident it's relevant)
  -- items below CURATION_CONFIDENCE_THRESHOLD are discarded before queuing

  ai_model_version    text,
  -- e.g. "gpt-4o-2024-11-20"
  -- stored so we can audit which model version made which decision

  prismic_document_id text,
  -- filled in when an article is approved and the Prismic draft is created

  created_at          timestamptz default now(),
  reviewed_at         timestamptz,
  reviewed_by         text
  -- email of the admin user who approved/rejected
);
```

### `ai_feedback`
Every rejection (and positive approval note) that should teach the AI. Queried on every classification call.

```sql
create table ai_feedback (
  id              uuid primary key default gen_random_uuid(),
  queue_item_id   uuid references content_queue(id),
  relevant        boolean not null,
  -- true = this was good content (auto-recorded on approval)
  -- false = this was wrong (recorded when user rejects)

  reason_category text check (reason_category in (
    'wrong_group',       -- not an artist we cover
    'not_girl_group',    -- male group or mixed
    'not_idol_related',  -- anime / 2D / voice acting / unrelated entertainment
    'already_covered',   -- we already posted about this topic
    'not_newsworthy',    -- too minor or uninteresting
    'wrong_format',      -- AI suggested tweet but should be article, or vice versa
    'duplicate',         -- same story from a different source
    'other'              -- requires a reason_text entry
  )),
  reason_text     text,
  -- required when reason_category = 'other'
  -- optional explanation for any category

  source_type     text,
  -- 'twitter' | 'rss' | 'html'
  -- lets us filter feedback by source type if needed

  created_at      timestamptz default now()
);
```

### `crawl_log`
Prevents the same article or tweet from being queued twice, even across crawl runs.

```sql
create table crawl_log (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid references content_sources(id),
  item_id       text not null,
  -- the unique identifier for this piece of content:
  -- RSS/HTML → the item's <link> or <guid> URL
  -- Twitter  → the tweet URL from Nitter's RSS feed
  crawled_at    timestamptz default now(),
  unique (source_id, item_id)
  -- if we've seen this (source, item) combination before, skip it
);
```

### `curation_settings`
A single row storing the configurable settings for the AI pipeline.

```sql
create table curation_settings (
  id                    int primary key default 1,
  -- enforces single row
  keywords_include      text[] default '{}',
  -- e.g. ARRAY['idol', 'アイドル', 'Hello! Project']
  keywords_exclude      text[] default '{}',
  -- e.g. ARRAY['anime', 'vtuber', '声優']
  confidence_threshold  float not null default 0.5,
  -- items below this score are discarded without queuing
  low_confidence_action text not null default 'discard'
    check (low_confidence_action in ('discard', 'flag')),
  -- 'discard' = never shown
  -- 'flag'    = queued but shown with a ⚠️ warning
  nitter_instance       text not null default 'https://nitter.net',
  -- can be updated from the Settings UI without a code deploy
  updated_at            timestamptz default now()
);

-- insert the default row on first migration:
insert into curation_settings (id) values (1) on conflict do nothing;
```

---

## API Routes

All routes under `/api/admin/curation/` are auth-protected the same way as existing admin routes.

### Crawl (called by GitHub Actions — protected by `CRON_SECRET`, not session cookie)

```
POST /api/admin/curation/crawl/fetch
```
Reads all active sources from `content_sources`. For each one, fetches the RSS feed (or scrapes HTML). Checks each item against `crawl_log`. New items are inserted into `content_queue` with `status: 'raw'`. Writes `last_error` to the source row if a fetch fails (but does not stop processing other sources).
Returns `{ fetched: number, new: number, skipped: number, errors: string[] }`.

```
POST /api/admin/curation/crawl/process
```
Picks up up to 10 `raw` items from `content_queue`. Sends each to OpenAI for relevance classification. Relevant items get a second OpenAI call for translation + formatting, then `status` moves to `'pending'`. Irrelevant items are deleted (or optionally archived). Also auto-records a positive `ai_feedback` entry when items are approved.
Returns `{ processed: number, queued: number, discarded: number }`.

### Manual crawl trigger (from admin UI "Crawl now" button)
```
POST /api/admin/curation/sources/[id]/crawl
```
Runs fetch + process for a single source. Used to test a new source without waiting for the next scheduled run.

### Queue
```
GET  /api/admin/curation/queue
     ?status=pending&type=tweet&source_id=...&page=1&limit=20
     Returns paginated queue items with source label joined in.

POST /api/admin/curation/queue/[id]/approve
     Approves the item.
     - For articles: calls Prismic Migration API, writes prismic_document_id back, returns Prismic edit URL.
     - For tweets: just updates status to 'approved'.
     - Either way: inserts a positive ai_feedback row automatically.
     Body: { edited_content?: object }  ← optional override if user edited the content

POST /api/admin/curation/queue/[id]/reject
     Body: { reason_category: string, reason_text?: string }
     Updates status to 'rejected', inserts ai_feedback row.

PUT  /api/admin/curation/queue/[id]
     Body: { translated_content: object }
     Lets user save edits to translated content before approving.
```

### Sources
```
GET    /api/admin/curation/sources
POST   /api/admin/curation/sources    { type, label, url, crawl_config? }
PUT    /api/admin/curation/sources/[id]  { label?, url?, active?, crawl_config? }
DELETE /api/admin/curation/sources/[id]
```

### Settings
```
GET /api/admin/curation/settings
PUT /api/admin/curation/settings
    { keywords_include?, keywords_exclude?, confidence_threshold?,
      low_confidence_action?, nitter_instance? }
```

---

## GitHub Actions

One workflow file. Two steps so each API call stays fast and within the 30s Vercel timeout.

### `.github/workflows/crawl.yml`
```yaml
name: Crawl news and Twitter sources
on:
  schedule:
    - cron: '0 */3 * * *'   # runs every 3 hours
  workflow_dispatch:          # can also be triggered manually from GitHub.com → Actions tab

jobs:
  crawl:
    runs-on: ubuntu-latest
    steps:
      - name: Step 1 — Fetch new content from sources
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/admin/curation/crawl/fetch" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            --fail --max-time 25

      - name: Step 2 — Process new items with AI
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/admin/curation/crawl/process" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            --fail --max-time 25
```

**Setup: add these two secrets in GitHub → Settings → Secrets and variables → Actions:**
- `APP_URL` — your Vercel production URL (e.g. `https://www.bonjouridol.com`)
- `CRON_SECRET` — a random secret string you make up (e.g. generate one at passwordsgenerator.net). The same string goes into Vercel env vars too.

---

## New Environment Variables

Add these in Vercel → Project → Settings → Environment Variables.

```env
# OpenAI — get from platform.openai.com/api-keys
OPENAI_API_KEY=sk-...

# The Nitter instance used to read Twitter accounts as RSS feeds.
# If this instance goes down, just update this one value and redeploy.
# Find working instances at: https://github.com/zedeus/nitter/wiki/Instances
NITTER_INSTANCE=https://nitter.net

# A random secret to authenticate GitHub Actions calls to the crawl endpoint.
# Must match the CRON_SECRET value you set in GitHub Secrets.
CRON_SECRET=some-random-string-here
```

The confidence threshold and Nitter instance can also be changed from the Settings UI without a code deploy (stored in `curation_settings` table).

---

## AI Pipeline — Prompt Design

### Step 1: Relevance check + type classification

One OpenAI call per raw item. The group list is fetched from Prismic at the start of each process run and cached for that run (so we don't call Prismic 10× per run).

**System prompt (assembled at runtime):**
```
You are a content filter for Bonjour Idol, an English-language publication
covering Japanese female idol groups.

INCLUDE:
- News about Japanese female idol groups and their members
- Announcements: new singles, albums, concerts, tours, member changes, collabs
- Press releases from idol management agencies about female groups
- Official group tweets worth translating for an international English-speaking audience

EXCLUDE — hard rules, no exceptions:
- Male idol groups or male artists of any kind
  (Johnny's, STARTO Entertainment, LDH male acts, boy bands, etc.)
- Anime, 2D idols, virtual YouTubers, voice actors
- General Japanese entertainment news not about idol groups
- Sports, politics, or anything unrelated to idol music

GROUPS WE COVER (prioritise content about these):
[fetched at runtime from Prismic artist API]
e.g. "CUTIE STREET (きゅーすと), FRUITS ZIPPER (フルーツジッパー), ..."

KEYWORDS TO PRIORITISE: [from curation_settings.keywords_include]
KEYWORDS TO DEPRIORITISE: [from curation_settings.keywords_exclude]

RECENT FEEDBACK — editorial decisions that should guide your judgment:
[last 30 rows from ai_feedback, formatted as:]
"APPROVED: [content summary]"
"REJECTED (not_girl_group): [content summary]"
"REJECTED (already_covered): [content summary]"
...

Respond with a JSON object only. No explanation outside the JSON.
```

**User message sent to OpenAI:**
```
Source type: [rss / html / twitter]
Title: [scraped title or null]
Body: [scraped body text, truncated to 2000 chars if longer]
URL: [source_url]
```

**Expected response:**
```json
{
  "relevant": true,
  "confidence": 0.87,
  "type": "article",
  "reasoning": "Press release from a management agency about a new single by a female idol group in our directory."
}
```
- `type: "tweet"` — short item, translates well as a standalone tweet
- `type: "article"` — press release or multi-paragraph announcement, needs article treatment
- Items with `relevant: false` are deleted from the queue (or flagged if `low_confidence_action = 'flag'`)
- Items with `confidence < threshold` are discarded without queuing

### Step 2: Translation + formatting

Second OpenAI call, only for items where `relevant: true`. Format differs by type.

**For tweets — output matches Bonjour Idol's established style:**
```
【PRESS RELEASE】
(use 【NEWS】 for non-press-release Twitter sources)

[Engaging English headline, punchy, written for idol fans, with a relevant emoji]

➡️ [article URL — leave as {ARTICLE_URL} placeholder if article not yet published] (英語/日本語)

@[group_twitter_handle]

#[EnglishHashtag] #[日本語ハッシュタグ]
```

⚠️ The AI must keep the tweet body under 240 characters (leaving room for URLs and handles). The character count is validated before saving.

**Tweet JSON output stored in `translated_content`:**
```json
{
  "tweet_body": "【PRESS RELEASE】\n\nCUTIE STREET to Perform New Pokémon Ending Theme; Pikachu Gets an Idol Makeover 💛\n\n@CUTIE_STREET_\n\n#CUTIESTREET #きゅーすと",
  "ja_original": "きゅーすとがポケモンの新エンディングテーマを担当...",
  "group_handle": "@CUTIE_STREET_",
  "suggested_hashtags": ["#CUTIESTREET", "#きゅーすと"]
}
```

**For articles — maps directly to Prismic `articles` custom type fields:**
```json
{
  "title": "CUTIE STREET to Perform New Pokémon Ending Theme",
  "subtitle": "Pikachu Gets an Idol Makeover",
  "idol_name": "CUTIE STREET",
  "en_body": "Full English translation of the press release, multiple paragraphs...",
  "ja_original": "Japanese original text...",
  "group_handle": "@CUTIE_STREET_",
  "suggested_hashtags": ["#CUTIESTREET", "#きゅーすと"]
}
```

---

## Prismic Article Draft — Integration

When an article is approved, the approve API route creates a Prismic draft using the Migration API (same pattern as the gallery manager). Here is the exact field mapping:

```js
// The RichText slice has text + text_ja in a single slice —
// confirmed from src/slices/RichText/model.json
const prismicDocument = {
  type: "articles",
  uid: slugify(translated_content.title) + "-" + dateString,
  // e.g. "cutie-street-pokemon-2026-04-29"
  lang: "en-gb",
  data: {
    title:            translated_content.title,
    subtitle:         translated_content.subtitle ?? "",
    type:             "Press release",
    idol_name:        translated_content.idol_name,
    publication_date: new Date().toISOString().split("T")[0],
    // featured_image, author, gallery_link → left empty, filled manually in Prismic
    slices: [
      {
        slice_type: "rich_text",
        variation:  "default",
        primary: {
          title:    null,
          title_ja: null,
          anchor:   null,
          text: paragraphsToStructuredText(translated_content.en_body),
          // converts plain text paragraphs into Prismic's StructuredText format:
          // [{ type: "paragraph", text: "...", spans: [] }, ...]
          text_ja: paragraphsToStructuredText(translated_content.ja_original)
        },
        items: []
      }
    ]
  }
}
```

The approve route returns the Prismic dashboard edit URL for the new draft (e.g. `https://bonjouridol.prismic.io/documents~b=working&c=published&l=en-us/{document_id}/`), shown as a link in the admin UI so the editor can jump straight to it.

**Fields left for manual completion in Prismic:** `featured_image`, `author`, `gallery_link`, `venue`, `event_date`, all SEO fields.

---

## Feedback Learning — How the AI Gets Smarter

**What happens now (Phases 1–4):**
Every time the AI classifies a new item, we fetch the last 30 rows from `ai_feedback` and include them in the system prompt as examples. The AI sees things like:

> "REJECTED (not_girl_group): Press release about SixTONES new single"
> "APPROVED: FRUITS ZIPPER announces 2nd anniversary concert"

This shapes future decisions without any model training — it's called "few-shot prompting". It works well at low volumes and costs nothing extra.

**Cold start:** If there are 0 feedback rows yet, the feedback section is simply omitted from the prompt. The AI still works using its static rules.

**Phase 6 upgrade (when you have 100+ feedback entries):**
Instead of always using the most recent 30, we use OpenAI embeddings to find the 15 past decisions most *similar* to the new item. This is called semantic search — it means if you rejected a voice actor story 6 months ago, that rejection still influences similar voice actor stories today even if it's no longer in the most recent 30. This is a drop-in upgrade: one database migration + one function change.

---

## Estimated Costs

Approximate monthly spend for a personal OpenAI account at this usage level.

**Assumptions:**
- 8 crawl runs/day (every 3h)
- Average 3 new relevant items per run on a normal day, up to 15 on a busy announcement day
- gpt-4o pricing: ~$2.50/1M input tokens, ~$10/1M output tokens

| Scenario | Items/day | AI calls/day | Est. daily cost | Est. monthly |
|---|---|---|---|---|
| Quiet day | 3 | 6–9 | ~$0.02 | |
| Normal day | 10 | 20–30 | ~$0.08 | |
| Busy day | 30 | 60–90 | ~$0.25 | |
| **Monthly total** | | | | **~$3–8/month** |

This is well within a personal account's budget. The main cost driver is the translation step (longer prompts), not the classification step.

---

## Admin UI — Full Specification

### Navigation update — `src/app/admin/layout.js`

Add a new nav item to the existing sidebar, between "Gallery Manager" and the user info section:

```jsx
<li>
  <Link
    href="/admin/curation"
    className={pathname.startsWith('/admin/curation') ? styles.active : ''}
  >
    Content Queue
  </Link>
</li>
```

---

### Page: `/admin/curation` — Dashboard

Landing page for the curation section. Gives a quick health overview without needing to drill into the queue.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Content Queue                          [Go to Queue →]│
├──────────────┬──────────────┬──────────────┬─────────┤
│ Pending      │ Approved     │ Rejected     │Published│
│ review       │ this week    │ this week    │ total   │
│   [N]        │   [N]        │   [N]        │  [N]    │
├──────────────┴──────────────┴──────────────┴─────────┤
│ Rejection breakdown (last 30 days)                   │
│ [Bar or donut chart by reason_category]              │
│  not_girl_group ████████ 40%                         │
│  already_covered ████ 20%                            │
│  not_newsworthy ████ 20%                             │
│  other ████ 20%                                      │
├──────────────────────────────────────────────────────┤
│ Source Health                        [Manage Sources]│
│ ┌─────────────────────────┬──────────┬──────────┐   │
│ │ Source                  │ Last run │ Status   │   │
│ │ PR Times Entertainment  │ 2h ago   │ ✓ OK     │   │
│ │ @CUTIE_STREET_          │ 2h ago   │ ✓ OK     │   │
│ │ @fruits_zipper          │ 2h ago   │ ⚠ Error  │   │
│ └─────────────────────────┴──────────┴──────────┘   │
└──────────────────────────────────────────────────────┘
```

---

### Page: `/admin/curation/queue` — Review Queue

The main working page. This is where content is reviewed, edited, approved, or rejected.

**Top bar:**
```
┌──────────────────────────────────────────────────────────────┐
│ [Pending (12)] [Approved (3)] [Rejected (8)] [Published (45)]│
│                                                              │
│ Filter by type: [All ▾]   Filter by source: [All sources ▾] │
└──────────────────────────────────────────────────────────────┘
```
- Status tabs act as primary filter, show count in brackets
- Type and source filters narrow within the selected status tab
- Pending tab is selected by default

**Queue item card — PENDING state:**
```
┌──────────────────────────────────────────────────────────────┐
│ [PR Times RSS]  [ARTICLE]  ●●●●○ 87%     2 hours ago        │
│                                                              │
│ CUTIE STREET to Perform New Pokémon Ending Theme             │
│ ─────────────────────────────────────────────────────────── │
│ CUTIE STREET, the five-member idol group known for their     │
│ playful performances, has been announced as the performers   │
│ of the new ending theme for the Pokémon animated series...   │
│                                                              │
│ [▼ Show Japanese original]                                   │
│ [▼ Show AI reasoning]                                        │
│ [▼ Show images (2)]                                          │
│                                                              │
│ [Approve]  [Edit & Approve]  [Reject]                        │
└──────────────────────────────────────────────────────────────┘
```

- **Source badge** — label from `content_sources` (e.g. "PR Times RSS", "@fruits_zipper")
- **Type badge** — TWEET (blue) or ARTICLE (pink)
- **Confidence dots** — 5 dots filled proportionally to `ai_confidence`. 87% = 4.35 dots ≈ 4 filled. Color: green >70%, amber 50–70%, red <50%
- **Japanese original** — collapsed by default, expand to compare with translation
- **AI reasoning** — collapsed by default, shows `ai_reasoning` text. Useful for understanding why borderline items were included
- **Images** — collapsed, shows each `image_urls[]` entry as a clickable link that opens the image in a new tab (for saving manually before tweeting)
- **Approve** — one-click approval. For articles: shows a loading spinner then a "Open in Prismic →" link on success
- **Edit & Approve** — expands an inline edit form (see below)
- **Reject** — expands inline rejection form (see below)

**Inline edit form (Edit & Approve):**

For TWEET type:
```
┌──────────────────────────────────────────────────────────────┐
│ Edit tweet before approving                                  │
│ ──────────────────────────────────────────────────────────── │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ 【PRESS RELEASE】                                    │    │
│ │                                                      │    │
│ │ CUTIE STREET to Perform New Pokémon Ending Theme 💛  │    │
│ │                                                      │    │
│ │ @CUTIE_STREET_                                       │    │
│ │                                                      │    │
│ │ #CUTIESTREET #きゅーすと                             │    │
│ └──────────────────────────────────────────────────────┘    │
│ 142 / 280 characters  ✓                                      │
│                                                              │
│ [Save & Approve]  [Cancel]                                   │
└──────────────────────────────────────────────────────────────┘
```
- Textarea is pre-filled with `translated_content.tweet_body`
- Live character counter (green ≤240, amber 241–270, red >270)
- Saving calls PUT then POST approve

For ARTICLE type:
```
┌──────────────────────────────────────────────────────────────┐
│ Edit article before approving                                │
│ ──────────────────────────────────────────────────────────── │
│ Title:    [CUTIE STREET to Perform New Pokémon Ending Theme] │
│ Subtitle: [Pikachu Gets an Idol Makeover                   ] │
│ Group:    [CUTIE STREET                                     ] │
│                                                              │
│ English body:                                                │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ CUTIE STREET, the five-member idol group...          │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
│ Japanese original (read-only, goes into Prismic as-is):     │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ きゅーすとがポケモンの新エンディング...              │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
│ [Save & Approve → Create Prismic Draft]  [Cancel]           │
└──────────────────────────────────────────────────────────────┘
```

**Inline rejection form:**
```
┌──────────────────────────────────────────────────────────────┐
│ Why are you rejecting this?                                  │
│                                                              │
│ ○ Not a group we cover                                       │
│ ○ Male group or male artist                                  │
│ ○ Anime / 2D / voice acting — not a real idol                │
│ ○ Already covered this story                                 │
│ ○ Not newsworthy enough                                      │
│ ○ Wrong format (should be [tweet/article] not [article/tweet])│
│ ○ Duplicate from another source                              │
│ ○ Other: [___________________________________]               │
│                                                              │
│ [Confirm Reject]  [Cancel]                                   │
└──────────────────────────────────────────────────────────────┘
```
- Radio buttons for `reason_category`
- "Other" reveals a required text input
- "Wrong format" option dynamically says which swap is suggested based on current type
- Submits to `POST /api/admin/curation/queue/[id]/reject`

**Queue item card — APPROVED state (tweet):**
```
┌──────────────────────────────────────────────────────────────┐
│ [PR Times RSS]  [TWEET]  ●●●●○ 87%     Approved 1h ago      │
│                                                              │
│ CUTIE STREET: New Pokémon Ending Theme Announcement          │
│ ─────────────────────────────────────────────────────────── │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ 【PRESS RELEASE】                                    │    │
│ │                                                      │    │
│ │ CUTIE STREET to Perform New Pokémon Ending Theme 💛  │    │
│ │                                                      │    │
│ │ @CUTIE_STREET_                                       │    │
│ │                                                      │    │
│ │ #CUTIESTREET #きゅーすと                             │    │
│ └──────────────────────────────────────────────────────┘    │
│ 142 / 280 ✓                                                  │
│                                                              │
│ [📋 Copy tweet text]  [Mark as Published]                   │
│                                                              │
│ Images to save manually:                                     │
│ → https://nitter.net/pic/... [Open image]                   │
└──────────────────────────────────────────────────────────────┘
```
- "Copy tweet text" copies `tweet_body` to clipboard
- "Mark as Published" sets `status: 'published'` (for your own tracking)
- Images listed as clickable links for manual download

**Queue item card — APPROVED state (article):**
```
┌──────────────────────────────────────────────────────────────┐
│ [PR Times RSS]  [ARTICLE]  ●●●●○ 87%    Approved 1h ago     │
│                                                              │
│ CUTIE STREET to Perform New Pokémon Ending Theme             │
│ ─────────────────────────────────────────────────────────── │
│ Prismic draft created ✓                                      │
│ [Open in Prismic dashboard →]                                │
│                                                              │
│ Associated tweet (copy for when you publish the article):    │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ 【PRESS RELEASE】                                    │    │
│ │ CUTIE STREET to Perform New Pokémon Ending Theme 💛  │    │
│ │ ➡️ {ARTICLE_URL} (英語/日本語)                       │    │
│ │ @CUTIE_STREET_ #CUTIESTREET #きゅーすと              │    │
│ └──────────────────────────────────────────────────────┘    │
│ (Replace {ARTICLE_URL} with the published article link)     │
│ [📋 Copy tweet text]   [Mark as Published]                  │
└──────────────────────────────────────────────────────────────┘
```

**Queue item card — REJECTED state:**
```
┌──────────────────────────────────────────────────────────────┐
│ [@fruits_zipper]  [TWEET]  ●●●○○ 55%    Rejected 3h ago     │
│                                                              │
│ Fruits Zipper Member Graduation Announcement                 │
│                                                              │
│ Rejection reason: Male group or male artist                  │
│                                                              │
│ [↩ Restore to Pending]                                       │
└──────────────────────────────────────────────────────────────┘
```
- Collapsed by default in Rejected tab
- "Restore to Pending" sets status back to `pending` (in case of a mistake)
- Rejected items stay in the database — they train the AI and can be reviewed

---

### Page: `/admin/curation/sources` — Source Manager

Where you add and manage the list of news sites and Twitter accounts to monitor.

**Main table:**
```
┌───────────────────────────────────────────────────────────────┐
│ Sources                                     [+ Add Source]    │
├────────────────────┬────────┬────────────────┬───────────────┤
│ Name               │ Type   │ URL / Handle   │ Status        │
├────────────────────┼────────┼────────────────┼───────────────┤
│ PR Times Ent.      │ RSS    │ prtimes.jp/... │ ✓ 2h ago      │
│ @CUTIE_STREET_     │ Twitter│ CUTIE_STREET_  │ ✓ 2h ago      │
│ @fruits_zipper     │ Twitter│ fruits_zipper  │ ⚠ Error       │
│ Natalie.mu         │ HTML   │ natalie.mu/... │ ✓ 2h ago      │
└────────────────────┴────────┴────────────────┴───────────────┘
```
- Each row has: active toggle (on/off), "Crawl now" button, edit button, delete button
- ⚠ Error badge — hovering/clicking shows the `last_error` message (e.g. "Nitter instance unreachable — try updating the Nitter instance in Settings")
- "Crawl now" triggers `POST /api/admin/curation/sources/[id]/crawl`, shows a loading spinner and result toast

**Add Source form (slide-in panel or modal):**
```
┌──────────────────────────────────────────┐
│ Add Source                               │
│ ──────────────────────────────────────── │
│ Type:  ● RSS  ○ HTML  ○ Twitter          │
│                                          │
│ Name:  [PR Times Entertainment         ] │
│                                          │
│ RSS URL:                                 │
│ [https://prtimes.jp/rss3.0.xml?catego...] │
│                                          │
│ [Add Source]                             │
└──────────────────────────────────────────┘
```

For Twitter type:
```
│ Type:  ○ RSS  ○ HTML  ● Twitter          │
│                                          │
│ Name:  [CUTIE STREET                   ] │
│                                          │
│ Twitter handle (without @):              │
│ [@] [CUTIE_STREET_                     ] │
│                                          │
│ Will monitor: nitter.net/CUTIE_STREET_/rss│
│                                          │
│ [Add Source]                             │
```

For HTML type:
```
│ Type:  ○ RSS  ● HTML  ○ Twitter          │
│                                          │
│ Name:  [Natalie.mu Idol Section        ] │
│                                          │
│ Page URL:                                │
│ [https://natalie.mu/music/tag/idol     ] │
│                                          │
│ (Optional) CSS selector for article title:│
│ [h1.NA_title                           ] │
│                                          │
│ (Optional) CSS selector for article body:│
│ [div.NA_article_text                   ] │
│                                          │
│ [Add Source]                             │
```

**Bulk add Twitter handles (bottom of page):**
```
┌──────────────────────────────────────────┐
│ Bulk add Twitter accounts                │
│                                          │
│ Paste one handle per line (no @):        │
│ ┌──────────────────────────────────────┐ │
│ │ CUTIE_STREET_                        │ │
│ │ fruits_zipper                        │ │
│ │ WACK_OFFICIAL                        │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [Import X handles as Twitter sources]   │
└──────────────────────────────────────────┘
```

---

### Page: `/admin/curation/settings` — Settings

```
┌──────────────────────────────────────────────────────────────┐
│ Curation Settings                                            │
│ ──────────────────────────────────────────────────────────── │
│ AI BEHAVIOUR                                                 │
│                                                              │
│ Relevance threshold                                          │
│ Items scored below this % are automatically discarded.       │
│ [────────────●────────────] 50%                              │
│ (Drag left to see more content, right to see less)          │
│                                                              │
│ Items below threshold:  ● Discard quietly                    │
│                         ○ Queue with ⚠ low-confidence flag   │
│ ──────────────────────────────────────────────────────────── │
│ KEYWORDS                                                     │
│                                                              │
│ Prioritise content about:                                    │
│ [AKB48] [Hello! Project] [STARTO] [+add]                    │
│                                                              │
│ Deprioritise content about:                                  │
│ [anime] [vtuber] [声優] [+add]                              │
│                                                              │
│ ──────────────────────────────────────────────────────────── │
│ TWITTER / NITTER                                             │
│                                                              │
│ Nitter instance:  [https://nitter.net              ]        │
│ [Test connection]  Last tested: OK ✓                        │
│                                                              │
│ If Twitter sources are failing, update this URL to a        │
│ working Nitter instance:                                     │
│ → https://github.com/zedeus/nitter/wiki/Instances           │
│                                                              │
│ ──────────────────────────────────────────────────────────── │
│ [Save Settings]                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

Each phase is a self-contained unit that can be built and tested independently.

### Phase 1 — Database + Sources UI
What gets built: the data layer and the ability to manage sources from the admin panel. Nothing runs yet.
- [ ] Supabase migrations for all 5 tables (`content_sources`, `content_queue`, `ai_feedback`, `crawl_log`, `curation_settings`)
- [ ] Source CRUD API routes
- [ ] Source Manager page (`/admin/curation/sources`) — full UI including bulk add
- [ ] Dashboard skeleton page (`/admin/curation`) — structure only, no real data yet
- [ ] Add "Content Queue" to admin nav in `layout.js`

### Phase 2 — Crawler (fetch step only)
What gets built: the crawler reads RSS feeds, deduplicates, and stores raw items. No AI yet — items stay as `status: 'raw'`.
- [ ] RSS feed fetch + parse utility (using `rss-parser` npm package)
- [ ] HTML scraper utility (Cheerio)
- [ ] Deduplication against `crawl_log`
- [ ] `POST /api/admin/curation/crawl/fetch` route with `CRON_SECRET` auth
- [ ] GitHub Actions workflow file (`.github/workflows/crawl.yml`) — runs Step 1 only for now
- [ ] Add `CRON_SECRET` and `APP_URL` to GitHub Secrets; add `CRON_SECRET` to Vercel env vars
- [ ] Test: manually trigger the workflow from GitHub → Actions, verify items appear in Supabase as `raw`

### Phase 3 — AI Pipeline (process step)
What gets built: raw items get classified, translated, and moved to `pending`. Items appear in the queue.
- [ ] OpenAI client setup + shared helper functions
- [ ] `fetchArtistNamesFromPrismic()` utility (called once per process run, cached)
- [ ] Step 1 prompt: relevance + type classification, with feedback injection
- [ ] Step 2 prompt: translation + formatting (tweet and article variants)
- [ ] Tweet character count validation (reject AI output > 240 chars, retry with instruction)
- [ ] `POST /api/admin/curation/crawl/process` route
- [ ] Add Step 2 to GitHub Actions workflow
- [ ] Test: trigger full crawl, verify items appear in `content_queue` as `pending` with correct `translated_content`

### Phase 4 — Queue UI + Feedback
What gets built: the main review interface. Users can approve, reject, and give feedback.
- [ ] Queue API routes (GET with filters, POST approve/reject, PUT edit)
- [ ] Queue page (`/admin/curation/queue`) — all states, filters, cards
- [ ] Inline edit form (tweet textarea + article fields)
- [ ] Inline reject form with `reason_category` options
- [ ] "Copy tweet text" button (clipboard API)
- [ ] Dashboard stats (counts, rejection breakdown chart)
- [ ] Settings page + API

### Phase 5 — Publishing Integrations
What gets built: article approval creates a Prismic draft; tweet approval shows the formatted copy UI.
- [ ] Article approve → Prismic Migration API call → write `prismic_document_id` → return Prismic edit URL
- [ ] `paragraphsToStructuredText()` utility — converts plain paragraphs to Prismic StructuredText format
- [ ] Show "Open in Prismic →" link on approved article cards
- [ ] Show associated tweet template on approved article cards (with `{ARTICLE_URL}` placeholder note)
- [ ] "Mark as Published" button → sets `status: 'published'`

### Phase 6 — Twitter Sources (Nitter RSS)
What gets built: Twitter accounts monitored as RSS. At this point the full system is operational.
- [ ] `twitter` source type in Source Manager (handle input, Nitter URL preview)
- [ ] Nitter URL construction in crawler: `${settings.nitter_instance}/${handle}/rss`
- [ ] Write `last_error` on Nitter fetch failure, surface ⚠ in Source Manager
- [ ] Nitter instance "Test connection" button in Settings
- [ ] Image URL display in queue item cards
- [ ] Add `NITTER_INSTANCE` to Vercel env vars
- [ ] Bulk import Twitter handles from Source Manager

### Phase 7 — Semantic Feedback (future, when feedback volume grows)
What gets built: smarter feedback retrieval using embedding similarity instead of recency.
- [ ] Enable pgvector extension on Supabase project
- [ ] Add `embedding vector(1536)` column to `content_queue`
- [ ] At process time: generate embedding for each item using `text-embedding-3-small`, store in column
- [ ] At classify time: query the 15 feedback entries with closest embedding to new item (cosine similarity)
- [ ] Replace last-30-rows query with nearest-neighbour query

---

## Prismic Artist API — Dynamic Group List

The `artist` custom type in Prismic has `name_en`, `name_jp`, and a `twitter` link field. This enables two improvements with no manual maintenance:

**1. Live group list injected into AI prompt**
At the start of each process run, fetch all published artist documents and inject their names into the classification prompt:

```js
async function fetchArtistNames(prismic) {
  const docs = await prismic.getAllByType('artist', {
    fetch: ['artist.name_en', 'artist.name_jp']
  });
  return docs
    .map(doc => `${doc.data.name_en} (${doc.data.name_jp})`)
    .join(', ');
  // → "CUTIE STREET (きゅーすと), FRUITS ZIPPER (フルーツジッパー), ..."
}
```

The prompt stays in sync with the directory automatically as you add new artists to Prismic.

**2. Bulk Twitter import from artist profiles (Phase 6 enhancement)**
Every artist document has a `twitter` field (a URL like `https://twitter.com/CUTIE_STREET_`). Rather than entering 50 handles one by one in the Source Manager, we can add a one-click "Import Twitter handles from Artist Directory" button that reads all artist Twitter URLs, extracts the handles, and creates `content_sources` rows in bulk.

---

## Open Questions / Things to Verify Before Starting

- **PR Times RSS feed**: check that `https://prtimes.jp/rss3.0.xml?category_id=entertainment` returns full article body text (not just titles + links). If only titles, the HTML scraper path will be needed for PR Times.
- **Nitter reliability**: before Phase 6, identify 1–2 consistently working instances (check [https://github.com/zedeus/nitter/wiki/Instances](https://github.com/zedeus/nitter/wiki/Instances)). The `nitter_instance` setting in the database means you can switch without a code deploy.
- **Nitter image proxying**: Nitter proxies images through its own domain. Test that those URLs remain accessible for display in the queue UI and for manual downloading.
- **Prismic `lang` field**: the article creation code uses `lang: "en-gb"` — confirm this matches the language setting in your Prismic repository (check any existing article document to verify).
