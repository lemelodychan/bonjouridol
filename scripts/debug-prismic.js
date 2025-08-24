#!/usr/bin/env node

const { createClient } = require('@prismicio/client');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const REPOSITORY_NAME = process.env.REPO_NAME || 'bonjouridol';
const ACCESS_TOKEN = process.env.PRISMIC_ACCESS_TOKEN;

async function debugPrismic() {
  console.log('🔍 Debugging Prismic Connection');
  console.log('==============================');
  
  try {
    if (!ACCESS_TOKEN) {
      throw new Error('PRISMIC_ACCESS_TOKEN environment variable is required');
    }
    
    console.log(`📋 Repository: ${REPOSITORY_NAME}`);
    console.log(`🔑 Access Token: ${ACCESS_TOKEN.substring(0, 8)}...`);
    console.log('');
    
    // Create Prismic client
    const client = createClient(REPOSITORY_NAME, {
      accessToken: ACCESS_TOKEN,
    });
    
    console.log('🔍 Testing basic API connection...');
    
    // Test 1: Try to get any document
    try {
      const anyDoc = await client.getAllByType('*', {
        pageSize: 1,
      });
      console.log(`✅ getAllByType("*") returned ${anyDoc.length} documents`);
    } catch (error) {
      console.log(`❌ getAllByType("*") failed: ${error.message}`);
    }
    
    // Test 2: Try specific document types
    const knownTypes = ['articles', 'gallery', 'homepage', 'page', 'author', 'artist'];
    
    for (const docType of knownTypes) {
      try {
        const docs = await client.getAllByType(docType, {
          pageSize: 10,
        });
        console.log(`✅ ${docType}: ${docs.length} documents found`);
        
        if (docs.length > 0) {
          console.log(`   Sample document ID: ${docs[0].id}`);
        }
      } catch (error) {
        console.log(`❌ ${docType}: ${error.message}`);
      }
    }
    
    // Test 3: Try to get repository info
    try {
      const api = await client.getApi();
      console.log(`✅ Repository API info: ${api.refs[0]?.label || 'Unknown'}`);
    } catch (error) {
      console.log(`❌ Could not get API info: ${error.message}`);
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ Debug failed!');
    console.error(error.message);
    process.exit(1);
  }
}

// Run the debug if this script is executed directly
if (require.main === module) {
  debugPrismic();
}

module.exports = { debugPrismic };
