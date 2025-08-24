#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@prismicio/client');
const archiver = require('archiver');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const REPOSITORY_NAME = process.env.REPO_NAME || 'bonjouridol';
const ACCESS_TOKEN = process.env.PRISMIC_ACCESS_TOKEN;
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const MAX_BACKUPS_TO_KEEP = 10;

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

    // Create Prismic client
    const client = createClient(REPOSITORY_NAME, {
      accessToken: ACCESS_TOKEN,
    });
    
    console.log(`🔗 Connected to Prismic repository: ${REPOSITORY_NAME}`);

async function getAllDocuments() {
  console.log('🔍 Fetching all documents from Prismic...');
  
  try {
    // Test the connection first
    console.log('🔍 Testing API connection...');
    const testResponse = await client.getAllByType('*', {
      pageSize: 1,
    });
    console.log(`✅ API connection successful. Test query returned ${testResponse.length} documents.`);
    
    // First, get all document types
    const response = await client.getAllByType('*', {
      pageSize: 1,
    });
    
    if (response.length === 0) {
      console.log('⚠️  No documents found with getAllByType("*") - trying alternative method...');
      
      // Try fetching specific document types we know exist
      const knownTypes = ['articles', 'gallery', 'homepage', 'page', 'author', 'artist'];
      const allDocuments = [];
      
      for (const docType of knownTypes) {
        try {
          console.log(`📄 Fetching ${docType} documents...`);
          const docs = await client.getAllByType(docType, {
            pageSize: 100,
          });
          allDocuments.push(...docs);
          console.log(`✅ Found ${docs.length} ${docType} documents`);
        } catch (error) {
          console.log(`⚠️  Could not fetch ${docType} documents: ${error.message}`);
        }
      }
      
      console.log(`✅ Successfully fetched ${allDocuments.length} documents total`);
      return allDocuments;
    }
    
    // If we got here, the wildcard query worked, so fetch all documents
    const allDocuments = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      console.log(`📄 Fetching page ${page}...`);
      
      const response = await client.getAllByType('*', {
        pageSize: 100,
        page: page,
      });
      
      if (response.length === 0) {
        hasMore = false;
      } else {
        allDocuments.push(...response);
        page++;
      }
    }
    
    console.log(`✅ Successfully fetched ${allDocuments.length} documents`);
    return allDocuments;
  } catch (error) {
    console.error('❌ Error fetching documents:', error);
    throw error;
  }
}

async function getCustomTypes() {
  console.log('🔍 Fetching custom types...');
  
  try {
    const customTypes = {};
    const customTypesDir = path.join(__dirname, '..', 'customtypes');
    
    if (fs.existsSync(customTypesDir)) {
      const typeDirs = fs.readdirSync(customTypesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const typeDir of typeDirs) {
        const indexPath = path.join(customTypesDir, typeDir, 'index.json');
        if (fs.existsSync(indexPath)) {
          const content = fs.readFileSync(indexPath, 'utf8');
          customTypes[typeDir] = JSON.parse(content);
        }
      }
    }
    
    console.log(`✅ Found ${Object.keys(customTypes).length} custom types`);
    return customTypes;
  } catch (error) {
    console.error('❌ Error fetching custom types:', error);
    throw error;
  }
}

async function getSlices() {
  console.log('🔍 Fetching slices...');
  
  try {
    const slices = {};
    const slicesDir = path.join(__dirname, '..', 'src', 'slices');
    
    if (fs.existsSync(slicesDir)) {
      const sliceDirs = fs.readdirSync(slicesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const sliceDir of sliceDirs) {
        const modelPath = path.join(slicesDir, sliceDir, 'model.json');
        const mocksPath = path.join(slicesDir, sliceDir, 'mocks.json');
        
        if (fs.existsSync(modelPath)) {
          const modelContent = fs.readFileSync(modelPath, 'utf8');
          slices[sliceDir] = {
            model: JSON.parse(modelContent)
          };
          
          if (fs.existsSync(mocksPath)) {
            const mocksContent = fs.readFileSync(mocksPath, 'utf8');
            slices[sliceDir].mocks = JSON.parse(mocksContent);
          }
        }
      }
    }
    
    console.log(`✅ Found ${Object.keys(slices).length} slices`);
    return slices;
  } catch (error) {
    console.error('❌ Error fetching slices:', error);
    throw error;
  }
}

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `prismic-backup-${timestamp}.zip`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);
  
  console.log(`🚀 Starting Prismic backup: ${backupFileName}`);
  
  try {
    // Fetch all data
    const [documents, customTypes, slices] = await Promise.all([
      getAllDocuments(),
      getCustomTypes(),
      getSlices()
    ]);
    
    // Create backup data structure
    const backupData = {
      metadata: {
        timestamp: new Date().toISOString(),
        repository: REPOSITORY_NAME,
        documentCount: documents.length,
        customTypesCount: Object.keys(customTypes).length,
        slicesCount: Object.keys(slices).length,
        version: '1.0.0'
      },
      documents: documents,
      customTypes: customTypes,
      slices: slices
    };
    
    // Create zip file
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    output.on('close', () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ Backup completed successfully!`);
      console.log(`📦 File: ${backupFileName}`);
      console.log(`📏 Size: ${sizeInMB} MB`);
      console.log(`📄 Documents: ${documents.length}`);
      console.log(`🏷️  Custom Types: ${Object.keys(customTypes).length}`);
      console.log(`🧩 Slices: ${Object.keys(slices).length}`);
    });
    
    archive.on('error', (err) => {
      throw err;
    });
    
    archive.pipe(output);
    
    // Add backup data as JSON
    archive.append(JSON.stringify(backupData, null, 2), { name: 'backup-data.json' });
    
    // Add individual document files for easier access
    const documentsDir = 'documents';
    for (const doc of documents) {
      const fileName = `${doc.type}-${doc.id}.json`;
      archive.append(JSON.stringify(doc, null, 2), { name: `${documentsDir}/${fileName}` });
    }
    
    // Add custom types
    const customTypesDir = 'custom-types';
    for (const [typeName, typeData] of Object.entries(customTypes)) {
      archive.append(JSON.stringify(typeData, null, 2), { name: `${customTypesDir}/${typeName}.json` });
    }
    
    // Add slices
    const slicesDir = 'slices';
    for (const [sliceName, sliceData] of Object.entries(slices)) {
      archive.append(JSON.stringify(sliceData, null, 2), { name: `${slicesDir}/${sliceName}.json` });
    }
    
    // Properly finalize the archive
    return new Promise((resolve, reject) => {
      output.on('close', () => {
        const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
        console.log(`✅ Backup completed successfully!`);
        console.log(`📦 File: ${backupFileName}`);
        console.log(`📏 Size: ${sizeInMB} MB`);
        console.log(`📄 Documents: ${documents.length}`);
        console.log(`🏷️  Custom Types: ${Object.keys(customTypes).length}`);
        console.log(`🧩 Slices: ${Object.keys(slices).length}`);
        
        // Clean up old backups after successful creation
        cleanupOldBackups().then(() => {
          resolve(backupPath);
        }).catch(reject);
      });
      
      archive.on('error', (err) => {
        reject(err);
      });
      
      archive.finalize();
    });
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

async function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.zip'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        mtime: fs.statSync(path.join(BACKUP_DIR, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    if (files.length > MAX_BACKUPS_TO_KEEP) {
      const filesToDelete = files.slice(MAX_BACKUPS_TO_KEEP);
      console.log(`🧹 Cleaning up ${filesToDelete.length} old backups...`);
      
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        console.log(`🗑️  Deleted: ${file.name}`);
      }
    }
  } catch (error) {
    console.error('⚠️  Error cleaning up old backups:', error);
  }
}

async function main() {
  try {
    if (!ACCESS_TOKEN) {
      console.error('❌ PRISMIC_ACCESS_TOKEN environment variable is required');
      console.error('');
      console.error('💡 To fix this:');
      console.error('1. Create a .env file in your project root');
      console.error('2. Add your Prismic access token:');
      console.error('   PRISMIC_ACCESS_TOKEN=your_access_token_here');
      console.error('3. Get your access token from: Prismic Dashboard > Settings > API & Security');
      console.error('');
      console.error('📝 Example .env file:');
      console.error('   REPO_NAME=bonjouridol');
      console.error('   PRISMIC_ACCESS_TOKEN=your_access_token_here');
      throw new Error('Missing PRISMIC_ACCESS_TOKEN');
    }
    
    console.log('🎯 Prismic Backup Tool');
    console.log('=====================');
    console.log(`Repository: ${REPOSITORY_NAME}`);
    console.log(`Backup Directory: ${BACKUP_DIR}`);
    console.log('');
    
    const backupPath = await createBackup();
    
    console.log('');
    console.log('🎉 Backup process completed successfully!');
    console.log(`📁 Backup location: ${backupPath}`);
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('💥 Backup process failed!');
    console.error(error.message);
    process.exit(1);
  }
}

// Run the backup if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { createBackup, getAllDocuments, getCustomTypes, getSlices };
