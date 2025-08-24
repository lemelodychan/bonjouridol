This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Prismic Content Backup

This project includes an automated backup system for Prismic CMS content. The backup system:

- **Automatically backs up** all content daily via GitHub Actions
- **Compresses data** into ZIP files with timestamps
- **Includes all documents**, custom types, and slices
- **Maintains version history** in the repository
- **Cleans up old backups** automatically (keeps 10 most recent)

### Quick Start

1. **Set up environment variables:**
   ```bash
   npm run backup:setup
   ```
   Then edit the `.env` file with your actual Prismic credentials.

2. **Test the connection:**
   ```bash
   npm run backup:test
   ```

3. **Create a manual backup:**
   ```bash
   npm run backup
   ```

4. **Verify existing backups:**
   ```bash
   npm run backup:verify
   ```

### Setup for Automated Backups

1. Add GitHub secrets:
   - `PRISMIC_ACCESS_TOKEN`: Your Prismic access token
   - `REPO_NAME`: Your Prismic repository name

2. The GitHub Action will automatically run weekly on Mondays at 10 AM JST (1 AM UTC)

For detailed documentation, see [`scripts/README.md`](scripts/README.md).
