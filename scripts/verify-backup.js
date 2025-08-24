#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

function listBackups() {
  const backupDir = path.join(__dirname, '..', 'backups');
  
  if (!fs.existsSync(backupDir)) {
    console.log('❌ No backups directory found');
    return [];
  }
  
  const files = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.zip'))
    .map(file => ({
      name: file,
      path: path.join(backupDir, file),
      size: fs.statSync(path.join(backupDir, file)).size,
      mtime: fs.statSync(path.join(backupDir, file)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);
  
  return files;
}

function extractBackupMetadata(backupPath) {
  return new Promise((resolve, reject) => {
    const metadata = {};
    
    const stream = fs.createReadStream(backupPath);
    const archive = archiver('zip');
    
    archive.on('entry', (entry) => {
      if (entry.name === 'backup-data.json') {
        let data = '';
        entry.on('data', (chunk) => {
          data += chunk.toString();
        });
        entry.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            metadata.timestamp = parsed.metadata.timestamp;
            metadata.repository = parsed.metadata.repository;
            metadata.documentCount = parsed.metadata.documentCount;
            metadata.customTypesCount = parsed.metadata.customTypesCount;
            metadata.slicesCount = parsed.metadata.slicesCount;
            metadata.version = parsed.metadata.version;
          } catch (error) {
            console.error('Error parsing backup metadata:', error);
          }
        });
      }
    });
    
    archive.on('end', () => {
      resolve(metadata);
    });
    
    archive.on('error', (error) => {
      reject(error);
    });
    
    stream.pipe(archive);
  });
}

async function verifyBackup(backupPath) {
  console.log(`🔍 Verifying backup: ${path.basename(backupPath)}`);
  
  try {
    const metadata = await extractBackupMetadata(backupPath);
    
    if (!metadata.timestamp) {
      console.log('❌ Invalid backup file - missing metadata');
      return false;
    }
    
    console.log('✅ Backup file is valid');
    console.log(`📅 Created: ${metadata.timestamp}`);
    console.log(`🏠 Repository: ${metadata.repository}`);
    console.log(`📄 Documents: ${metadata.documentCount}`);
    console.log(`🏷️  Custom Types: ${metadata.customTypesCount}`);
    console.log(`🧩 Slices: ${metadata.slicesCount}`);
    console.log(`📦 Version: ${metadata.version}`);
    
    return true;
  } catch (error) {
    console.log('❌ Error verifying backup:', error.message);
    return false;
  }
}

async function main() {
  const backups = listBackups();
  
  if (backups.length === 0) {
    console.log('📭 No backup files found');
    console.log('');
    console.log('To create a backup, run:');
    console.log('  npm run backup');
    return;
  }
  
  console.log('📦 Available Backups');
  console.log('====================');
  console.log('');
  
  for (let i = 0; i < backups.length; i++) {
    const backup = backups[i];
    const sizeInMB = (backup.size / 1024 / 1024).toFixed(2);
    const date = backup.mtime.toLocaleDateString();
    const time = backup.mtime.toLocaleTimeString();
    
    console.log(`${i + 1}. ${backup.name}`);
    console.log(`   📏 Size: ${sizeInMB} MB`);
    console.log(`   📅 Date: ${date} at ${time}`);
    console.log('');
  }
  
  // Verify the most recent backup
  console.log('🔍 Verifying most recent backup...');
  console.log('');
  
  const mostRecent = backups[0];
  const isValid = await verifyBackup(mostRecent.path);
  
  if (isValid) {
    console.log('');
    console.log('🎉 Backup verification completed successfully!');
  } else {
    console.log('');
    console.log('⚠️  Backup verification failed. You may want to create a new backup.');
  }
}

// Run the verification if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { listBackups, verifyBackup, extractBackupMetadata };
