#!/usr/bin/env node

const { createClient } = require('@prismicio/client');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const REPOSITORY_NAME = process.env.REPO_NAME || 'bonjouridol';
const ACCESS_TOKEN = process.env.PRISMIC_ACCESS_TOKEN;

async function testConnection() {
  console.log('🧪 Testing Prismic Backup System');
  console.log('================================');
  
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
    
    console.log(`📋 Repository: ${REPOSITORY_NAME}`);
    console.log(`🔑 Access Token: ${ACCESS_TOKEN.substring(0, 8)}...`);
    console.log('');
    
    // Create Prismic client
    const client = createClient(REPOSITORY_NAME, {
      accessToken: ACCESS_TOKEN,
    });
    
    console.log('🔍 Testing API connection...');
    
    // Test basic API call
    const response = await client.getAllByType('*', {
      pageSize: 1,
    });
    
    console.log('✅ API connection successful!');
    console.log(`📄 Found ${response.length} document(s) in test query`);
    
    // Test getting document types
    console.log('🔍 Testing document types...');
    const allDocs = await client.getAllByType('*', {
      pageSize: 100,
    });
    
    const documentTypes = [...new Set(allDocs.map(doc => doc.type))];
    console.log(`✅ Found ${documentTypes.length} document types:`);
    documentTypes.forEach(type => console.log(`   - ${type}`));
    
    console.log('');
    console.log('🎉 All tests passed! Your backup system is ready to use.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: npm run backup');
    console.log('2. Check the backups/ directory for your backup file');
    console.log('3. Set up GitHub secrets for automated backups');
    
  } catch (error) {
    console.error('');
    console.error('❌ Test failed!');
    console.error(error.message);
    
    if (error.message.includes('401')) {
      console.error('💡 This usually means your access token is invalid or expired.');
    } else if (error.message.includes('404')) {
      console.error('💡 This usually means your repository name is incorrect.');
    }
    
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testConnection();
}

module.exports = { testConnection };
