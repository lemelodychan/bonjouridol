# Prismic Content Backup System

This directory contains the automated backup system for your Prismic CMS content.

## Overview

The backup system automatically fetches all content from your Prismic repository and creates compressed backup files with the following data:

- **All Documents**: Complete content from all document types
- **Custom Types**: Your content type definitions
- **Slices**: Slice machine configurations and models
- **Metadata**: Backup information including timestamps and counts

## Files

- `backup-prismic.js` - Main backup script
- `README.md` - This documentation file

## Setup

### 1. Environment Variables

Make sure you have the following environment variables set:

```bash
PRISMIC_ACCESS_TOKEN=your_prismic_access_token
REPO_NAME=your_repository_name
```

### 2. Install Dependencies

The backup script requires additional dependencies. Install them with:

```bash
npm install
```

### 3. GitHub Secrets (for automated backups)

Add these secrets to your GitHub repository:

1. Go to your repository settings
2. Navigate to "Secrets and variables" → "Actions"
3. Add the following secrets:
   - `PRISMIC_ACCESS_TOKEN`: Your Prismic access token
   - `REPO_NAME`: Your Prismic repository name (e.g., "bonjouridol")

## Usage

### Manual Backup

Run a backup manually:

```bash
npm run backup
```

Or with explicit environment variables:

```bash
npm run backup:manual
```

### Automated Backups

The GitHub Action (`.github/workflows/prismic-backup.yml`) automatically runs:

- **Weekly on Mondays at 10 AM JST (1 AM UTC)** via cron schedule
- **On push** to main branch when backup script changes
- **Manually** via GitHub Actions UI

## Backup Structure

Each backup creates a ZIP file with the following structure:

```
prismic-backup-YYYY-MM-DDTHH-MM-SS-sssZ.zip
├── backup-data.json          # Complete backup data
├── documents/                # Individual document files
│   ├── articles-abc123.json
│   ├── gallery-def456.json
│   └── ...
├── custom-types/             # Custom type definitions
│   ├── articles.json
│   ├── gallery.json
│   └── ...
└── slices/                   # Slice configurations
    ├── HeroPost.json
    ├── Carousel.json
    └── ...
```

## Backup Metadata

Each backup includes metadata with:

- Timestamp of backup creation
- Repository name
- Document count
- Custom types count
- Slices count
- Backup version

## Storage and Cleanup

- Backups are stored in the `backups/` directory
- Backups older than 30 days are automatically deleted
- This keeps storage clean while maintaining a month of backup history
- Backup files are committed to the repository for version control

## Troubleshooting

### Common Issues

1. **Access Token Error**
   ```
   Error: PRISMIC_ACCESS_TOKEN environment variable is required
   ```
   - Ensure your access token is set correctly
   - Check that the token has the necessary permissions

2. **Repository Not Found**
   ```
   Error: Repository not found
   ```
   - Verify your `REPO_NAME` is correct
   - Check that your access token has access to the repository

3. **Rate Limiting**
   ```
   Error: Too many requests
   ```
   - The script includes built-in pagination to handle large datasets
   - If you have a very large repository, consider running backups during off-peak hours

### Debug Mode

To see more detailed output, you can modify the script to include debug logging:

```javascript
// Add this to the top of backup-prismic.js
process.env.DEBUG = 'true';
```

### Manual Recovery

To restore from a backup:

1. Download the backup ZIP file
2. Extract the contents
3. Use the `backup-data.json` file to understand the structure
4. Individual document files are available in the `documents/` directory

## Security Considerations

- Access tokens are stored as GitHub secrets
- Backup files contain sensitive content - ensure repository access is restricted
- Consider encrypting backup files for additional security
- Regularly rotate your Prismic access tokens

## Customization

### Backup Schedule

To change the backup frequency, edit `.github/workflows/prismic-backup.yml`:

```yaml
schedule:
  # Run weekly on Mondays at 10 AM JST (1 AM UTC) - current setting
  - cron: '0 1 * * 1'
  
  # Run daily at 2 AM UTC
  - cron: '0 2 * * *'
  
  # Run twice daily
  - cron: '0 2,14 * * *'
```

### Backup Retention

To change how long backups are kept, modify the `MAX_BACKUP_AGE_DAYS` constant in `backup-prismic.js`. The default is 30 days.

### Additional Data

To include additional data in backups, modify the `createBackup()` function in `backup-prismic.js`.

## Support

If you encounter issues:

1. Check the GitHub Actions logs for detailed error messages
2. Verify your environment variables are set correctly
3. Test the backup script manually first
4. Check Prismic's API status and rate limits

## Changelog

- **v1.0.0**: Initial release with basic backup functionality
- Includes document, custom type, and slice backup
- Automated GitHub Actions integration
- Automatic cleanup of old backups
